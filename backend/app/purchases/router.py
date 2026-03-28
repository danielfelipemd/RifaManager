from uuid import UUID

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.dependencies import CurrentTenantId, CurrentUser, DbSession
from app.purchases.models import Purchase
from app.purchases.schemas import PurchaseRead

router = APIRouter()


@router.get("/", response_model=list[PurchaseRead])
async def list_purchases(
    db: DbSession,
    tenant_id: CurrentTenantId,
    _user: CurrentUser,
    raffle_id: UUID | None = None,
    page: int = 1,
    page_size: int = 50,
):
    query = select(Purchase).where(Purchase.tenant_id == tenant_id)
    if raffle_id:
        query = query.where(Purchase.raffle_id == raffle_id)
    query = query.order_by(Purchase.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{purchase_id}", response_model=PurchaseRead)
async def get_purchase(purchase_id: UUID, db: DbSession, tenant_id: CurrentTenantId, _user: CurrentUser):
    result = await db.execute(
        select(Purchase).where(Purchase.id == purchase_id, Purchase.tenant_id == tenant_id)
    )
    purchase = result.scalar_one_or_none()
    if purchase is None:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    return purchase
