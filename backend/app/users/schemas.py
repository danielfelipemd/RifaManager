from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class UserCreate(BaseModel):
    nombre: str
    email: str
    password: str
    telefono: str | None = None
    role: str = "vendedor"


class UserRead(BaseModel):
    id: UUID
    tenant_id: UUID
    nombre: str
    email: str
    telefono: str | None
    role: str
    activo: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    nombre: str | None = None
    email: str | None = None
    telefono: str | None = None
    role: str | None = None
    activo: bool | None = None
