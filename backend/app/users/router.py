from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.auth.service import hash_password
from app.dependencies import AdminUser, CurrentTenantId, DbSession
from app.users.models import User
from app.users.schemas import UserCreate, UserRead, UserUpdate

router = APIRouter()


@router.get("", response_model=list[UserRead])
async def list_users(db: DbSession, tenant_id: CurrentTenantId, _user: AdminUser):
    result = await db.execute(
        select(User).where(User.tenant_id == tenant_id).order_by(User.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(data: UserCreate, db: DbSession, tenant_id: CurrentTenantId, _user: AdminUser):
    # Validate email uniqueness within tenant
    existing = await db.execute(
        select(User).where(User.tenant_id == tenant_id, User.email == data.email)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El email '{data.email}' ya existe en esta organizacion",
        )

    user = User(
        tenant_id=tenant_id,
        nombre=data.nombre,
        email=data.email,
        telefono=data.telefono,
        password_hash=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    await db.flush()
    return user


@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: UUID, db: DbSession, tenant_id: CurrentTenantId, _user: AdminUser):
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: UUID, data: UserUpdate, db: DbSession, tenant_id: CurrentTenantId, _user: AdminUser
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.flush()
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(user_id: UUID, db: DbSession, tenant_id: CurrentTenantId, _user: AdminUser):
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.activo = False
    await db.flush()
