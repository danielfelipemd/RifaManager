from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, field_validator


class RaffleCreate(BaseModel):
    nombre: str
    descripcion: str | None = None
    cantidad_numeros: int
    numero_digitos: int
    precio_boleta: Decimal
    fecha_sorteo: datetime | None = None
    loteria_asociada: str | None = None
    imagen_url: str | None = None

    @field_validator("numero_digitos")
    @classmethod
    def validate_digitos(cls, v):
        if v not in (2, 3, 4):
            raise ValueError("numero_digitos debe ser 2, 3 o 4")
        return v

    @field_validator("cantidad_numeros")
    @classmethod
    def validate_cantidad(cls, v):
        if v < 1:
            raise ValueError("cantidad_numeros debe ser mayor a 0")
        return v


class RaffleRead(BaseModel):
    id: UUID
    tenant_id: UUID
    nombre: str
    descripcion: str | None
    cantidad_numeros: int
    numero_digitos: int
    precio_boleta: Decimal
    estado: str
    fecha_sorteo: datetime | None
    loteria_asociada: str | None
    numero_ganador: str | None
    imagen_url: str | None
    created_by: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class RaffleUpdate(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None
    precio_boleta: Decimal | None = None
    fecha_sorteo: datetime | None = None
    loteria_asociada: str | None = None
    imagen_url: str | None = None


class RaffleWithStats(RaffleRead):
    tickets_disponibles: int = 0
    tickets_reservados: int = 0
    tickets_vendidos: int = 0
