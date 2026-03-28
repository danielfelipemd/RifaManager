from fastapi import APIRouter

from app.dependencies import AdminUser, CurrentTenantId, DbSession
from app.tenants.models import Tenant
from app.tenants.schemas import TenantRead, TenantUpdate

router = APIRouter()


@router.get("/me", response_model=TenantRead)
async def get_my_tenant(db: DbSession, tenant_id: CurrentTenantId, _user: AdminUser):
    tenant = await db.get(Tenant, tenant_id)
    return tenant


@router.put("/me", response_model=TenantRead)
async def update_my_tenant(
    data: TenantUpdate,
    db: DbSession,
    tenant_id: CurrentTenantId,
    _user: AdminUser,
):
    tenant = await db.get(Tenant, tenant_id)
    if data.nombre is not None:
        tenant.nombre = data.nombre
    if data.config is not None:
        tenant.config = data.config
    await db.flush()
    return tenant
