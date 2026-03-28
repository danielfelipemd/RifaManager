from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.purchases.models import Purchase
from app.raffles.models import Raffle
from app.tickets.models import Ticket
from app.tickets.schemas import BuyerInfo


async def reserve_ticket(
    db: AsyncSession,
    ticket_id: UUID,
    user_id: UUID,
    timeout_minutes: int | None = None,
) -> Ticket:
    if timeout_minutes is None:
        timeout_minutes = settings.RESERVATION_TIMEOUT_MINUTES

    # SELECT ... FOR UPDATE: acquire exclusive row lock
    result = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id).with_for_update()
    )
    ticket = result.scalar_one_or_none()

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    if ticket.estado == "vendido":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El ticket {ticket.numero} ya fue vendido",
        )

    if ticket.estado == "reservado":
        # Check if reservation expired
        if ticket.reservado_hasta and ticket.reservado_hasta > datetime.now(timezone.utc):
            if ticket.reservado_por != user_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"El ticket {ticket.numero} esta reservado por otro usuario",
                )
            # Already reserved by this user, extend reservation
        # Else: expired, allow re-reservation

    ticket.estado = "reservado"
    ticket.reservado_por = user_id
    ticket.reservado_hasta = datetime.now(timezone.utc) + timedelta(minutes=timeout_minutes)
    await db.flush()
    return ticket


async def cancel_reservation(db: AsyncSession, ticket_id: UUID, user_id: UUID) -> Ticket:
    result = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id).with_for_update()
    )
    ticket = result.scalar_one_or_none()

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    if ticket.estado != "reservado":
        raise HTTPException(status_code=400, detail="El ticket no esta reservado")

    if ticket.reservado_por != user_id:
        raise HTTPException(status_code=403, detail="No puedes cancelar la reserva de otro usuario")

    ticket.estado = "disponible"
    ticket.reservado_por = None
    ticket.reservado_hasta = None
    await db.flush()
    return ticket


async def purchase_ticket(
    db: AsyncSession,
    ticket_id: UUID,
    buyer: BuyerInfo,
    user_id: UUID,
) -> Purchase:
    # SELECT ... FOR UPDATE: acquire exclusive row lock
    result = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id).with_for_update()
    )
    ticket = result.scalar_one_or_none()

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    if ticket.estado == "vendido":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El ticket {ticket.numero} ya fue vendido",
        )

    # Allow purchase if available, or if reserved by this user, or if reservation expired
    if ticket.estado == "reservado":
        if ticket.reservado_por != user_id:
            if ticket.reservado_hasta and ticket.reservado_hasta > datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"El ticket {ticket.numero} esta reservado por otro usuario",
                )

    # Get raffle for price
    raffle = await db.get(Raffle, ticket.raffle_id)

    # Update ticket
    ticket.estado = "vendido"
    ticket.vendido_a_nombre = buyer.nombre
    ticket.vendido_a_telefono = buyer.telefono
    ticket.vendido_a_email = buyer.email
    ticket.reservado_por = None
    ticket.reservado_hasta = None

    # Create purchase record
    purchase = Purchase(
        tenant_id=ticket.tenant_id,
        ticket_id=ticket.id,
        raffle_id=ticket.raffle_id,
        usuario_id=user_id,
        comprador_nombre=buyer.nombre,
        comprador_telefono=buyer.telefono,
        comprador_email=buyer.email,
        monto=raffle.precio_boleta,
        metodo_pago=buyer.metodo_pago,
        notas=buyer.notas,
    )
    db.add(purchase)
    await db.flush()
    return purchase


async def bulk_purchase_tickets(
    db: AsyncSession,
    ticket_ids: list[UUID],
    buyer: BuyerInfo,
    user_id: UUID,
) -> list[Purchase]:
    if not ticket_ids:
        raise HTTPException(status_code=400, detail="No se proporcionaron tickets")

    # Sort IDs to prevent deadlocks (consistent lock ordering)
    sorted_ids = sorted(ticket_ids)

    # Lock all tickets in order
    result = await db.execute(
        select(Ticket)
        .where(Ticket.id.in_(sorted_ids))
        .order_by(Ticket.id)
        .with_for_update()
    )
    tickets = result.scalars().all()

    if len(tickets) != len(sorted_ids):
        raise HTTPException(status_code=404, detail="Uno o mas tickets no encontrados")

    # Validate all are available
    for ticket in tickets:
        if ticket.estado == "vendido":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El ticket {ticket.numero} ya fue vendido",
            )
        if ticket.estado == "reservado" and ticket.reservado_por != user_id:
            if ticket.reservado_hasta and ticket.reservado_hasta > datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"El ticket {ticket.numero} esta reservado por otro usuario",
                )

    # Get raffle for price (all tickets should be from same raffle)
    raffle = await db.get(Raffle, tickets[0].raffle_id)

    purchases = []
    for ticket in tickets:
        ticket.estado = "vendido"
        ticket.vendido_a_nombre = buyer.nombre
        ticket.vendido_a_telefono = buyer.telefono
        ticket.vendido_a_email = buyer.email
        ticket.reservado_por = None
        ticket.reservado_hasta = None

        purchase = Purchase(
            tenant_id=ticket.tenant_id,
            ticket_id=ticket.id,
            raffle_id=ticket.raffle_id,
            usuario_id=user_id,
            comprador_nombre=buyer.nombre,
            comprador_telefono=buyer.telefono,
            comprador_email=buyer.email,
            monto=raffle.precio_boleta,
            metodo_pago=buyer.metodo_pago,
            notas=buyer.notas,
        )
        db.add(purchase)
        purchases.append(purchase)

    await db.flush()
    return purchases


async def release_expired_reservations(db: AsyncSession) -> int:
    result = await db.execute(
        update(Ticket)
        .where(
            Ticket.estado == "reservado",
            Ticket.reservado_hasta < datetime.now(timezone.utc),
        )
        .values(
            estado="disponible",
            reservado_por=None,
            reservado_hasta=None,
        )
        .returning(Ticket.id)
    )
    released = result.all()
    await db.commit()
    return len(released)
