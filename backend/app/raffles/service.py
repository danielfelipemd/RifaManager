from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.raffles.models import Raffle
from app.raffles.schemas import RaffleCreate
from app.tickets.models import Ticket


async def create_raffle_with_tickets(
    db: AsyncSession, tenant_id: UUID, user_id: UUID, data: RaffleCreate
) -> Raffle:
    raffle = Raffle(
        tenant_id=tenant_id,
        nombre=data.nombre,
        descripcion=data.descripcion,
        cantidad_numeros=data.cantidad_numeros,
        numero_digitos=data.numero_digitos,
        precio_boleta=data.precio_boleta,
        fecha_sorteo=data.fecha_sorteo,
        loteria_asociada=data.loteria_asociada,
        imagen_url=data.imagen_url,
        created_by=user_id,
    )
    db.add(raffle)
    await db.flush()

    # Generate all ticket numbers
    tickets = []
    for i in range(data.cantidad_numeros):
        numero = str(i).zfill(data.numero_digitos)
        tickets.append(
            Ticket(
                raffle_id=raffle.id,
                tenant_id=tenant_id,
                numero=numero,
                estado="disponible",
            )
        )

    # Batch insert in chunks of 1000
    for start in range(0, len(tickets), 1000):
        chunk = tickets[start : start + 1000]
        db.add_all(chunk)
        await db.flush()

    return raffle


async def get_raffle_stats(db: AsyncSession, raffle_id: UUID) -> dict:
    result = await db.execute(
        select(Ticket.estado, func.count(Ticket.id))
        .where(Ticket.raffle_id == raffle_id)
        .group_by(Ticket.estado)
    )
    stats = {"disponibles": 0, "reservados": 0, "vendidos": 0}
    for estado, count in result.all():
        if estado == "disponible":
            stats["disponibles"] = count
        elif estado == "reservado":
            stats["reservados"] = count
        elif estado == "vendido":
            stats["vendidos"] = count
    return stats
