from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TenantRead(BaseModel):
    id: UUID
    nombre: str
    slug: str
    plan: str
    activo: bool
    config: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class TenantUpdate(BaseModel):
    nombre: str | None = None
    config: dict | None = None
