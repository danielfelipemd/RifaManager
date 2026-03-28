from uuid import UUID

from fastapi import APIRouter
from sqlalchemy import func, select

from app.dependencies import AdminUser, CurrentTenantId, DbSession
from app.purchases.models import Purchase
from app.raffles.models import Raffle
from app.tickets.models import Ticket

router = APIRouter()


@router.get("/metrics")
async def get_metrics(db: DbSession, tenant_id: CurrentTenantId, _user: AdminUser):
    # Total revenue
    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Purchase.monto), 0)).where(Purchase.tenant_id == tenant_id)
    )
    total_revenue = float(revenue_result.scalar())

    # Total purchases
    purchases_result = await db.execute(
        select(func.count(Purchase.id)).where(Purchase.tenant_id == tenant_id)
    )
    total_purchases = purchases_result.scalar()

    # Active raffles
    active_result = await db.execute(
        select(func.count(Raffle.id)).where(
            Raffle.tenant_id == tenant_id, Raffle.estado == "activa"
        )
    )
    active_raffles = active_result.scalar()

    # Ticket stats
    ticket_stats = await db.execute(
        select(Ticket.estado, func.count(Ticket.id))
        .where(Ticket.tenant_id == tenant_id)
        .group_by(Ticket.estado)
    )
    tickets = {row[0]: row[1] for row in ticket_stats.all()}

    return {
        "ingresos_totales": total_revenue,
        "total_compras": total_purchases,
        "rifas_activas": active_raffles,
        "tickets_disponibles": tickets.get("disponible", 0),
        "tickets_reservados": tickets.get("reservado", 0),
        "tickets_vendidos": tickets.get("vendido", 0),
    }


@router.get("/metrics/{raffle_id}")
async def get_raffle_metrics(
    raffle_id: UUID, db: DbSession, tenant_id: CurrentTenantId, _user: AdminUser
):
    # Revenue for this raffle
    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Purchase.monto), 0)).where(
            Purchase.raffle_id == raffle_id, Purchase.tenant_id == tenant_id
        )
    )
    revenue = float(revenue_result.scalar())

    # Purchases count
    purchases_result = await db.execute(
        select(func.count(Purchase.id)).where(
            Purchase.raffle_id == raffle_id, Purchase.tenant_id == tenant_id
        )
    )
    total_purchases = purchases_result.scalar()

    # Ticket stats
    ticket_stats = await db.execute(
        select(Ticket.estado, func.count(Ticket.id))
        .where(Ticket.raffle_id == raffle_id, Ticket.tenant_id == tenant_id)
        .group_by(Ticket.estado)
    )
    tickets = {row[0]: row[1] for row in ticket_stats.all()}

    return {
        "raffle_id": str(raffle_id),
        "ingresos": revenue,
        "total_compras": total_purchases,
        "tickets_disponibles": tickets.get("disponible", 0),
        "tickets_reservados": tickets.get("reservado", 0),
        "tickets_vendidos": tickets.get("vendido", 0),
    }
