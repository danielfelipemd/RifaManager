from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.admin.schemas import (
    PlatformStats,
    TenantCreate,
    TenantDetail,
    TenantUpdateAdmin,
    UserOfTenant,
)
from app.auth.service import hash_password
from app.dependencies import DbSession, SuperAdmin
from app.purchases.models import Purchase
from app.raffles.models import Raffle
from app.tenants.models import Tenant
from app.users.models import User

router = APIRouter()


@router.get("/stats", response_model=PlatformStats)
async def platform_stats(db: DbSession, _user: SuperAdmin):
    """Global platform statistics."""
    tenants_count = (await db.execute(select(func.count(Tenant.id)))).scalar()
    tenants_activos = (await db.execute(
        select(func.count(Tenant.id)).where(Tenant.activo.is_(True))
    )).scalar()
    users_count = (await db.execute(select(func.count(User.id)))).scalar()
    raffles_count = (await db.execute(select(func.count(Raffle.id)))).scalar()
    purchases_count = (await db.execute(select(func.count(Purchase.id)))).scalar()
    revenue = (await db.execute(
        select(func.coalesce(func.sum(Purchase.monto), 0))
    )).scalar()

    return PlatformStats(
        total_tenants=tenants_count,
        total_users=users_count,
        total_raffles=raffles_count,
        total_purchases=purchases_count,
        total_revenue=float(revenue),
        tenants_activos=tenants_activos,
    )


@router.get("/tenants", response_model=list[TenantDetail])
async def list_all_tenants(db: DbSession, _user: SuperAdmin):
    """List all tenants with stats."""
    tenants = (await db.execute(
        select(Tenant).order_by(Tenant.created_at.desc())
    )).scalars().all()

    result = []
    for tenant in tenants:
        users_count = (await db.execute(
            select(func.count(User.id)).where(User.tenant_id == tenant.id)
        )).scalar()
        raffles_count = (await db.execute(
            select(func.count(Raffle.id)).where(Raffle.tenant_id == tenant.id)
        )).scalar()
        purchases_count = (await db.execute(
            select(func.count(Purchase.id)).where(Purchase.tenant_id == tenant.id)
        )).scalar()
        revenue = (await db.execute(
            select(func.coalesce(func.sum(Purchase.monto), 0)).where(Purchase.tenant_id == tenant.id)
        )).scalar()

        result.append(TenantDetail(
            id=tenant.id,
            nombre=tenant.nombre,
            slug=tenant.slug,
            plan=tenant.plan,
            activo=tenant.activo,
            config=tenant.config,
            created_at=tenant.created_at,
            total_users=users_count,
            total_raffles=raffles_count,
            total_purchases=purchases_count,
            total_revenue=revenue,
        ))

    return result


@router.post("/tenants", response_model=TenantDetail, status_code=status.HTTP_201_CREATED)
async def create_tenant(data: TenantCreate, db: DbSession, _user: SuperAdmin):
    """Create a new tenant with its admin user."""
    existing = await db.execute(select(Tenant).where(Tenant.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"El slug '{data.slug}' ya existe")

    tenant = Tenant(nombre=data.nombre, slug=data.slug, plan=data.plan)
    db.add(tenant)
    await db.flush()

    admin_user = User(
        tenant_id=tenant.id,
        nombre=data.admin_nombre,
        email=data.admin_email,
        telefono=data.admin_telefono,
        password_hash=hash_password(data.admin_password),
        role="admin",
    )
    db.add(admin_user)
    await db.flush()

    return TenantDetail(
        id=tenant.id,
        nombre=tenant.nombre,
        slug=tenant.slug,
        plan=tenant.plan,
        activo=tenant.activo,
        config=tenant.config,
        created_at=tenant.created_at,
        total_users=1,
        total_raffles=0,
        total_purchases=0,
    )


@router.put("/tenants/{tenant_id}", response_model=TenantDetail)
async def update_tenant(tenant_id: UUID, data: TenantUpdateAdmin, db: DbSession, _user: SuperAdmin):
    """Update a tenant (activate/deactivate, change plan, rename)."""
    tenant = await db.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tenant, field, value)
    await db.flush()

    return TenantDetail(
        id=tenant.id,
        nombre=tenant.nombre,
        slug=tenant.slug,
        plan=tenant.plan,
        activo=tenant.activo,
        config=tenant.config,
        created_at=tenant.created_at,
    )


@router.get("/tenants/{tenant_id}/users", response_model=list[UserOfTenant])
async def list_tenant_users(tenant_id: UUID, db: DbSession, _user: SuperAdmin):
    """List all users of a specific tenant."""
    result = await db.execute(
        select(User).where(User.tenant_id == tenant_id).order_by(User.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/tenants/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_tenant(tenant_id: UUID, db: DbSession, _user: SuperAdmin):
    """Deactivate a tenant (soft delete)."""
    tenant = await db.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    if tenant.slug == "platform":
        raise HTTPException(status_code=400, detail="No se puede desactivar el tenant de plataforma")
    tenant.activo = False
    await db.flush()
