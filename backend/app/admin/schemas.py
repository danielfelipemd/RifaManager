from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class TenantDetail(BaseModel):
    id: UUID
    nombre: str
    slug: str
    plan: str
    activo: bool
    config: dict
    created_at: datetime
    total_users: int = 0
    total_raffles: int = 0
    total_purchases: int = 0
    total_revenue: Decimal = Decimal("0")


class TenantCreate(BaseModel):
    nombre: str
    slug: str
    plan: str = "basic"
    admin_nombre: str
    admin_email: str
    admin_password: str
    admin_telefono: str | None = None


class TenantUpdateAdmin(BaseModel):
    nombre: str | None = None
    plan: str | None = None
    activo: bool | None = None


class PlatformStats(BaseModel):
    total_tenants: int
    total_users: int
    total_raffles: int
    total_purchases: int
    total_revenue: float
    tenants_activos: int


class UserOfTenant(BaseModel):
    id: UUID
    nombre: str
    email: str
    telefono: str | None
    role: str
    activo: bool
    created_at: datetime

    model_config = {"from_attributes": True}
