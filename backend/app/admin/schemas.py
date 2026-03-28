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


class PlatformConfigRead(BaseModel):
    clave: str
    valor: str
    descripcion: str | None

    model_config = {"from_attributes": True}


class PlatformConfigUpdate(BaseModel):
    valor: str


class CommissionPreview(BaseModel):
    valor_rifa: float
    porcentaje: float
    comision: float


class PaymentRequestRead(BaseModel):
    id: UUID
    tenant_id: UUID
    raffle_id: UUID
    monto: Decimal
    porcentaje: Decimal
    estado: str
    metodo_pago: str
    comprobante_ref: str | None
    notas_cliente: str | None
    notas_admin: str | None
    aprobado_por: UUID | None
    created_at: datetime
    aprobado_at: datetime | None
    # Joined fields
    tenant_nombre: str | None = None
    raffle_nombre: str | None = None

    model_config = {"from_attributes": True}


class PaymentRequestCreate(BaseModel):
    raffle_id: UUID
    comprobante_ref: str | None = None
    notas_cliente: str | None = None


class PaymentApproval(BaseModel):
    notas_admin: str | None = None
