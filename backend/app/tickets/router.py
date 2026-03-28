from uuid import UUID

from fastapi import APIRouter, status
from sqlalchemy import func, select

from app.dependencies import CurrentTenantId, CurrentUser, DbSession
from app.purchases.schemas import PurchaseRead
from app.tickets.models import Ticket
from app.tickets.schemas import BulkPurchaseRequest, BuyerInfo, TicketRead, TicketSummary
from app.tickets.service import (
    bulk_purchase_tickets,
    cancel_reservation,
    purchase_ticket,
    reserve_ticket,
)

router = APIRouter()


@router.get("/raffles/{raffle_id}/tickets", response_model=list[TicketRead])
async def list_tickets(
    raffle_id: UUID,
    db: DbSession,
    tenant_id: CurrentTenantId,
    _user: CurrentUser,
    estado: str | None = None,
    page: int = 1,
    page_size: int = 100,
):
    query = select(Ticket).where(
        Ticket.raffle_id == raffle_id,
        Ticket.tenant_id == tenant_id,
    )
    if estado:
        query = query.where(Ticket.estado == estado)

    query = query.order_by(Ticket.numero).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/raffles/{raffle_id}/tickets/summary", response_model=TicketSummary)
async def tickets_summary(
    raffle_id: UUID,
    db: DbSession,
    tenant_id: CurrentTenantId,
    _user: CurrentUser,
):
    result = await db.execute(
        select(Ticket.estado, func.count(Ticket.id))
        .where(Ticket.raffle_id == raffle_id, Ticket.tenant_id == tenant_id)
        .group_by(Ticket.estado)
    )
    counts = {row[0]: row[1] for row in result.all()}
    return TicketSummary(
        total=sum(counts.values()),
        disponibles=counts.get("disponible", 0),
        reservados=counts.get("reservado", 0),
        vendidos=counts.get("vendido", 0),
    )


@router.post("/tickets/{ticket_id}/reserve", response_model=TicketRead)
async def reserve(ticket_id: UUID, db: DbSession, user: CurrentUser, tenant_id: CurrentTenantId):
    ticket = await reserve_ticket(db, ticket_id, user.id, tenant_id)
    return ticket


@router.delete("/tickets/{ticket_id}/reserve", response_model=TicketRead)
async def cancel_reserve(ticket_id: UUID, db: DbSession, user: CurrentUser, tenant_id: CurrentTenantId):
    ticket = await cancel_reservation(db, ticket_id, user.id, tenant_id)
    return ticket


@router.post("/tickets/{ticket_id}/purchase", response_model=PurchaseRead)
async def purchase(ticket_id: UUID, buyer: BuyerInfo, db: DbSession, user: CurrentUser, tenant_id: CurrentTenantId):
    result = await purchase_ticket(db, ticket_id, buyer, user.id, tenant_id)
    return result


@router.post(
    "/raffles/{raffle_id}/tickets/bulk-purchase",
    response_model=list[PurchaseRead],
    status_code=status.HTTP_201_CREATED,
)
async def bulk_purchase(
    raffle_id: UUID,
    data: BulkPurchaseRequest,
    db: DbSession,
    user: CurrentUser,
    tenant_id: CurrentTenantId,
):
    purchases = await bulk_purchase_tickets(db, data.ticket_ids, data.buyer, user.id, tenant_id)
    return purchases
