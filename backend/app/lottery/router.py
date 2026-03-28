from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import AdminUser, CurrentTenantId, CurrentUser, DbSession
from app.lottery.models import LotteryProvider, LotteryResult
from app.lottery.schemas import (
    CheckWinnerResponse,
    LotteryProviderCreate,
    LotteryProviderRead,
    LotteryProviderUpdate,
    LotteryResultRead,
    ScrapedResult,
)
from app.lottery.scraper import scrape_all_results
from app.lottery.service import check_raffle_winner, fetch_and_store_results, get_results_history

router = APIRouter()


# ==================== Lottery Providers (CRUD) ====================

@router.get("/providers", response_model=list[LotteryProviderRead])
async def list_providers(db: DbSession, _user: CurrentUser):
    result = await db.execute(
        select(LotteryProvider).order_by(LotteryProvider.nombre)
    )
    return result.scalars().all()


@router.post("/providers", response_model=LotteryProviderRead, status_code=status.HTTP_201_CREATED)
async def create_provider(data: LotteryProviderCreate, db: DbSession, _user: AdminUser):
    existing = await db.execute(
        select(LotteryProvider).where(LotteryProvider.slug == data.slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"El slug '{data.slug}' ya existe")

    provider = LotteryProvider(
        nombre=data.nombre,
        slug=data.slug,
        url_oficial=data.url_oficial,
        dia_sorteo=data.dia_sorteo,
    )
    db.add(provider)
    await db.flush()
    return provider


@router.put("/providers/{provider_id}", response_model=LotteryProviderRead)
async def update_provider(
    provider_id: UUID, data: LotteryProviderUpdate, db: DbSession, _user: AdminUser
):
    result = await db.execute(select(LotteryProvider).where(LotteryProvider.id == provider_id))
    provider = result.scalar_one_or_none()
    if provider is None:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(provider, field, value)
    await db.flush()
    return provider


@router.delete("/providers/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider(provider_id: UUID, db: DbSession, _user: AdminUser):
    result = await db.execute(select(LotteryProvider).where(LotteryProvider.id == provider_id))
    provider = result.scalar_one_or_none()
    if provider is None:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    await db.delete(provider)
    await db.flush()


# ==================== Scraping & Results ====================

@router.post("/fetch", response_model=list[LotteryResultRead])
async def fetch_results(db: DbSession, tenant_id: CurrentTenantId, _user: AdminUser):
    """Scrape latest lottery results from aggregator and store them."""
    stored = await fetch_and_store_results(db, tenant_id)
    return stored


@router.get("/scrape-preview", response_model=list[ScrapedResult])
async def preview_scrape(_user: AdminUser):
    """Preview scraped results without storing (dry run)."""
    results = await scrape_all_results()
    return results


@router.get("/results", response_model=list[LotteryResultRead])
async def list_results(
    db: DbSession,
    tenant_id: CurrentTenantId,
    _user: CurrentUser,
    loteria: str | None = None,
    limit: int = 50,
):
    results = await get_results_history(db, tenant_id, loteria, limit)
    return results


@router.post("/check/{raffle_id}", response_model=CheckWinnerResponse)
async def check_winner(raffle_id: UUID, db: DbSession, tenant_id: CurrentTenantId, _user: AdminUser):
    """Check if a raffle has a winner based on stored lottery results."""
    try:
        result = await check_raffle_winner(db, raffle_id, tenant_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
