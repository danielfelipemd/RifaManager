from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.models import PaymentRequest, PlatformConfig
from app.admin.schemas import (
    CommissionPreview,
    PaymentApproval,
    PaymentRequestCreate,
    PaymentRequestRead,
    PlatformConfigRead,
    PlatformConfigUpdate,
    PlatformStats,
    TenantCreate,
    TenantDetail,
    TenantUpdateAdmin,
    UserOfTenant,
)
from app.auth.service import hash_password
from app.dependencies import AdminUser, CurrentTenantId, CurrentUser, DbSession, SuperAdmin
from app.purchases.models import Purchase
from app.raffles.models import Raffle
from app.tenants.models import Tenant
from app.users.models import User

router = APIRouter()


# ==================== Platform Config ====================

@router.get("/config", response_model=list[PlatformConfigRead])
async def get_all_config(db: DbSession, _user: SuperAdmin):
    result = await db.execute(select(PlatformConfig).order_by(PlatformConfig.clave))
    return result.scalars().all()


@router.get("/config/{clave}", response_model=PlatformConfigRead)
async def get_config(clave: str, db: DbSession, _user: CurrentUser):
    result = await db.execute(select(PlatformConfig).where(PlatformConfig.clave == clave))
    config = result.scalar_one_or_none()
    if config is None:
        raise HTTPException(status_code=404, detail=f"Config '{clave}' no encontrada")
    return config


@router.put("/config/{clave}", response_model=PlatformConfigRead)
async def update_config(clave: str, data: PlatformConfigUpdate, db: DbSession, _user: SuperAdmin):
    result = await db.execute(select(PlatformConfig).where(PlatformConfig.clave == clave))
    config = result.scalar_one_or_none()
    if config is None:
        config = PlatformConfig(clave=clave, valor=data.valor)
        db.add(config)
    else:
        config.valor = data.valor
        config.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return config


@router.get("/commission-preview", response_model=CommissionPreview)
async def commission_preview(valor_rifa: float, db: DbSession, _user: CurrentUser):
    """Calculate commission for a given raffle value."""
    result = await db.execute(
        select(PlatformConfig).where(PlatformConfig.clave == "comision_porcentaje")
    )
    config = result.scalar_one_or_none()
    porcentaje = float(config.valor) if config else 0.05
    comision = valor_rifa * porcentaje
    return CommissionPreview(valor_rifa=valor_rifa, porcentaje=porcentaje, comision=comision)


# ==================== Payment Requests ====================

@router.post("/payments/request", response_model=PaymentRequestRead)
async def create_payment_request(
    data: PaymentRequestCreate, db: DbSession, user: AdminUser, tenant_id: CurrentTenantId
):
    """Client creates a payment request to activate a raffle."""
    raffle = await db.execute(
        select(Raffle).where(Raffle.id == data.raffle_id, Raffle.tenant_id == tenant_id)
    )
    raffle = raffle.scalar_one_or_none()
    if raffle is None:
        raise HTTPException(status_code=404, detail="Rifa no encontrada")

    if raffle.estado != "borrador":
        raise HTTPException(status_code=400, detail="Solo rifas en borrador pueden solicitar activacion")

    # Check no existing pending request
    existing = await db.execute(
        select(PaymentRequest).where(
            PaymentRequest.raffle_id == data.raffle_id,
            PaymentRequest.estado == "pendiente",
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya existe una solicitud de pago pendiente para esta rifa")

    # Get commission: tenant-specific first, then platform default
    tenant = await db.get(Tenant, tenant_id)
    if tenant and tenant.comision_porcentaje is not None:
        porcentaje = tenant.comision_porcentaje
    else:
        config = await db.execute(
            select(PlatformConfig).where(PlatformConfig.clave == "comision_porcentaje")
        )
        config = config.scalar_one_or_none()
        porcentaje = Decimal(config.valor) if config else Decimal("0.05")

    valor_total = raffle.precio_boleta * raffle.cantidad_numeros
    comision = valor_total * porcentaje

    payment = PaymentRequest(
        tenant_id=tenant_id,
        raffle_id=data.raffle_id,
        monto=comision,
        porcentaje=porcentaje,
        comprobante_ref=data.comprobante_ref,
        notas_cliente=data.notas_cliente,
    )
    db.add(payment)
    await db.flush()

    result = PaymentRequestRead.model_validate(payment)
    result.raffle_nombre = raffle.nombre
    return result


@router.get("/payments/my-requests", response_model=list[PaymentRequestRead])
async def my_payment_requests(db: DbSession, tenant_id: CurrentTenantId, _user: AdminUser):
    """Client sees their own payment requests."""
    result = await db.execute(
        select(PaymentRequest)
        .where(PaymentRequest.tenant_id == tenant_id)
        .order_by(PaymentRequest.created_at.desc())
    )
    payments = result.scalars().all()

    response = []
    for p in payments:
        raffle = await db.get(Raffle, p.raffle_id)
        pr = PaymentRequestRead.model_validate(p)
        pr.raffle_nombre = raffle.nombre if raffle else None
        response.append(pr)
    return response


@router.get("/payments/all", response_model=list[PaymentRequestRead])
async def all_payment_requests(db: DbSession, _user: SuperAdmin, estado: str | None = None):
    """Super admin sees ALL payment requests across tenants."""
    query = select(PaymentRequest).order_by(PaymentRequest.created_at.desc())
    if estado:
        query = query.where(PaymentRequest.estado == estado)
    result = await db.execute(query)
    payments = result.scalars().all()

    response = []
    for p in payments:
        tenant = await db.get(Tenant, p.tenant_id)
        raffle = await db.get(Raffle, p.raffle_id)
        pr = PaymentRequestRead.model_validate(p)
        pr.tenant_nombre = tenant.nombre if tenant else None
        pr.raffle_nombre = raffle.nombre if raffle else None
        response.append(pr)
    return response


@router.post("/payments/{payment_id}/approve", response_model=PaymentRequestRead)
async def approve_payment(
    payment_id: UUID, data: PaymentApproval, db: DbSession, user: SuperAdmin
):
    """Super admin approves payment and activates the raffle."""
    payment = await db.get(PaymentRequest, payment_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    if payment.estado != "pendiente":
        raise HTTPException(status_code=400, detail="Solo se pueden aprobar solicitudes pendientes")

    # Approve payment
    payment.estado = "aprobado"
    payment.aprobado_por = user.id
    payment.aprobado_at = datetime.now(timezone.utc)
    payment.notas_admin = data.notas_admin

    # Activate the raffle
    raffle = await db.get(Raffle, payment.raffle_id)
    if raffle and raffle.estado == "borrador":
        raffle.estado = "activa"

    await db.flush()

    tenant = await db.get(Tenant, payment.tenant_id)
    result = PaymentRequestRead.model_validate(payment)
    result.tenant_nombre = tenant.nombre if tenant else None
    result.raffle_nombre = raffle.nombre if raffle else None
    return result


@router.post("/payments/{payment_id}/reject", response_model=PaymentRequestRead)
async def reject_payment(
    payment_id: UUID, data: PaymentApproval, db: DbSession, user: SuperAdmin
):
    """Super admin rejects a payment request."""
    payment = await db.get(PaymentRequest, payment_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    if payment.estado != "pendiente":
        raise HTTPException(status_code=400, detail="Solo se pueden rechazar solicitudes pendientes")

    payment.estado = "rechazado"
    payment.aprobado_por = user.id
    payment.aprobado_at = datetime.now(timezone.utc)
    payment.notas_admin = data.notas_admin
    await db.flush()

    return PaymentRequestRead.model_validate(payment)


# ==================== Platform Stats ====================

@router.get("/stats", response_model=PlatformStats)
async def platform_stats(db: DbSession, _user: SuperAdmin):
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


# ==================== Tenant Management ====================

@router.get("/tenants", response_model=list[TenantDetail])
async def list_all_tenants(db: DbSession, _user: SuperAdmin):
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
            id=tenant.id, nombre=tenant.nombre, slug=tenant.slug, plan=tenant.plan,
            activo=tenant.activo, config=tenant.config, created_at=tenant.created_at,
            comision_porcentaje=tenant.comision_porcentaje,
            total_users=users_count, total_raffles=raffles_count,
            total_purchases=purchases_count, total_revenue=revenue,
        ))
    return result


@router.post("/tenants", response_model=TenantDetail, status_code=status.HTTP_201_CREATED)
async def create_tenant(data: TenantCreate, db: DbSession, _user: SuperAdmin):
    existing = await db.execute(select(Tenant).where(Tenant.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"El slug '{data.slug}' ya existe")

    tenant = Tenant(nombre=data.nombre, slug=data.slug, plan=data.plan,
                    comision_porcentaje=data.comision_porcentaje)
    db.add(tenant)
    await db.flush()

    admin_user = User(
        tenant_id=tenant.id, nombre=data.admin_nombre, email=data.admin_email,
        telefono=data.admin_telefono, password_hash=hash_password(data.admin_password),
        role="admin",
    )
    db.add(admin_user)
    await db.flush()

    return TenantDetail(
        id=tenant.id, nombre=tenant.nombre, slug=tenant.slug, plan=tenant.plan,
        activo=tenant.activo, config=tenant.config, created_at=tenant.created_at,
        comision_porcentaje=tenant.comision_porcentaje,
        total_users=1, total_raffles=0, total_purchases=0,
    )


@router.put("/tenants/{tenant_id}", response_model=TenantDetail)
async def update_tenant(tenant_id: UUID, data: TenantUpdateAdmin, db: DbSession, _user: SuperAdmin):
    tenant = await db.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tenant, field, value)
    await db.flush()
    return TenantDetail(
        id=tenant.id, nombre=tenant.nombre, slug=tenant.slug, plan=tenant.plan,
        activo=tenant.activo, config=tenant.config, created_at=tenant.created_at,
    )


@router.get("/tenants/{tenant_id}/users", response_model=list[UserOfTenant])
async def list_tenant_users(tenant_id: UUID, db: DbSession, _user: SuperAdmin):
    result = await db.execute(
        select(User).where(User.tenant_id == tenant_id).order_by(User.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/tenants/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_tenant(tenant_id: UUID, db: DbSession, _user: SuperAdmin):
    tenant = await db.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    if tenant.slug == "platform":
        raise HTTPException(status_code=400, detail="No se puede desactivar el tenant de plataforma")
    tenant.activo = False
    await db.flush()
