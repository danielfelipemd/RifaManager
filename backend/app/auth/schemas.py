from uuid import UUID

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    tenant_nombre: str
    tenant_slug: str
    nombre: str
    email: str
    password: str
    telefono: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserInfo"


class UserInfo(BaseModel):
    id: UUID
    nombre: str
    email: str
    role: str
    tenant_id: UUID

    model_config = {"from_attributes": True}


class RefreshRequest(BaseModel):
    refresh_token: str
