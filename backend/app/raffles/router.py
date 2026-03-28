from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import AdminUser, CurrentTenantId, CurrentUser, DbSession
from app.raffles.models import Raffle
from app.raffles.schemas import RaffleCreate, RaffleRead, RaffleUpdate, RaffleWithStats
from app.raffles.service import create_raffle_with_tickets, get_raffle_stats

router = APIRouter()


@router.get("", response_model=list[RaffleRead])
async def list_raffles(db: DbSession, tenant_id: CurrentTenantId, _user: CurrentUser):
    result = await db.execute(
        select(Raffle).where(Raffle.tenant_id == tenant_id).order_by(Raffle.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=RaffleRead, status_code=status.HTTP_201_CREATED)
async def create_raffle(data: RaffleCreate, db: DbSession, tenant_id: CurrentTenantId, user: AdminUser):
    raffle = await create_raffle_with_tickets(db, tenant_id, user.id, data)
    return raffle


@router.get("/{raffle_id}", response_model=RaffleWithStats)
async def get_raffle(raffle_id: UUID, db: DbSession, tenant_id: CurrentTenantId, _user: CurrentUser):
    result = await db.execute(
        select(Raffle).where(Raffle.id == raffle_id, Raffle.tenant_id == tenant_id)
    )
    raffle = result.scalar_one_or_none()
    if raffle is None:
        raise HTTPException(status_code=404, detail="Rifa no encontrada")

    stats = await get_raffle_stats(db, raffle_id)
    raffle_data = RaffleWithStats.model_validate(raffle)
    raffle_data.tickets_disponibles = stats["disponibles"]
    raffle_data.tickets_reservados = stats["reservados"]
    raffle_data.tickets_vendidos = stats["vendidos"]
    return raffle_data


@router.put("/{raffle_id}", response_model=RaffleRead)
async def update_raffle(
    raffle_id: UUID, data: RaffleUpdate, db: DbSession, tenant_id: CurrentTenantId, _user: AdminUser
):
    result = await db.execute(
        select(Raffle).where(Raffle.id == raffle_id, Raffle.tenant_id == tenant_id)
    )
    raffle = result.scalar_one_or_none()
    if raffle is None:
        raise HTTPException(status_code=404, detail="Rifa no encontrada")

    if raffle.estado == "finalizada":
        raise HTTPException(status_code=400, detail="No se puede editar una rifa finalizada")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(raffle, field, value)
    await db.flush()
    return raffle


@router.post("/{raffle_id}/activate", response_model=RaffleRead)
async def activate_raffle(raffle_id: UUID, db: DbSession, tenant_id: CurrentTenantId, _user: AdminUser):
    result = await db.execute(
        select(Raffle).where(Raffle.id == raffle_id, Raffle.tenant_id == tenant_id)
    )
    raffle = result.scalar_one_or_none()
    if raffle is None:
        raise HTTPException(status_code=404, detail="Rifa no encontrada")

    if raffle.estado != "borrador":
        raise HTTPException(status_code=400, detail="Solo se pueden activar rifas en borrador")

    raffle.estado = "activa"
    await db.flush()
    return raffle


@router.post("/{raffle_id}/finalize", response_model=RaffleRead)
async def finalize_raffle(raffle_id: UUID, db: DbSession, tenant_id: CurrentTenantId, _user: AdminUser):
    result = await db.execute(
        select(Raffle).where(Raffle.id == raffle_id, Raffle.tenant_id == tenant_id)
    )
    raffle = result.scalar_one_or_none()
    if raffle is None:
        raise HTTPException(status_code=404, detail="Rifa no encontrada")

    if raffle.estado != "activa":
        raise HTTPException(status_code=400, detail="Solo se pueden finalizar rifas activas")

    raffle.estado = "finalizada"
    await db.flush()
    return raffle
