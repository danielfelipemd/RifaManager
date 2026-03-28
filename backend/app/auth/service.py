from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import create_access_token, create_refresh_token, decode_token
from app.auth.schemas import RegisterRequest, TokenResponse, UserInfo
from app.tenants.models import Tenant
from app.users.models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email, User.activo.is_(True)))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.password_hash):
        return None
    return user


def create_tokens(user: User) -> TokenResponse:
    token_data = {
        "sub": str(user.id),
        "tenant_id": str(user.tenant_id),
        "role": user.role,
    }
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=UserInfo.model_validate(user),
    )


async def register_tenant_and_admin(db: AsyncSession, data: RegisterRequest) -> TokenResponse:
    tenant = Tenant(nombre=data.tenant_nombre, slug=data.tenant_slug)
    db.add(tenant)
    await db.flush()

    user = User(
        tenant_id=tenant.id,
        nombre=data.nombre,
        email=data.email,
        telefono=data.telefono,
        password_hash=hash_password(data.password),
        role="admin",
    )
    db.add(user)
    await db.flush()

    return create_tokens(user)


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> TokenResponse | None:
    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        return None

    user_id = payload.get("sub")
    if user_id is None:
        return None

    result = await db.execute(select(User).where(User.id == user_id, User.activo.is_(True)))
    user = result.scalar_one_or_none()
    if user is None:
        return None

    return create_tokens(user)
