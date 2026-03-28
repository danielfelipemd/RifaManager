from fastapi import APIRouter, HTTPException, status

from app.auth.schemas import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, UserInfo
from app.auth.service import authenticate_user, create_tokens, refresh_access_token, register_tenant_and_admin
from app.dependencies import CurrentUser, DbSession

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(data: RegisterRequest, db: DbSession):
    try:
        tokens = await register_tenant_and_admin(db, data)
        return tokens
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al registrar: {str(e)}",
        )


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: DbSession):
    user = await authenticate_user(db, data.email, data.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )
    return create_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: DbSession):
    tokens = await refresh_access_token(db, data.refresh_token)
    if tokens is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalido o expirado",
        )
    return tokens


@router.get("/me", response_model=UserInfo)
async def me(current_user: CurrentUser):
    return UserInfo.model_validate(current_user)
