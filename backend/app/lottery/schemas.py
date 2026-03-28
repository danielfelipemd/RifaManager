from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class LotteryProviderRead(BaseModel):
    id: UUID
    nombre: str
    slug: str
    url_oficial: str | None
    activo: bool
    dia_sorteo: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class LotteryProviderCreate(BaseModel):
    nombre: str
    slug: str
    url_oficial: str | None = None
    dia_sorteo: str | None = None


class LotteryProviderUpdate(BaseModel):
    nombre: str | None = None
    url_oficial: str | None = None
    activo: bool | None = None
    dia_sorteo: str | None = None


class LotteryResultRead(BaseModel):
    id: UUID
    loteria: str
    numero: str
    fecha: date
    serie: str | None
    raw_data: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ScrapedResult(BaseModel):
    loteria: str
    numero: str
    serie: str | None = None
    fecha: str
    sorteo: str | None = None
    premio_mayor: str | None = None


class CheckWinnerResponse(BaseModel):
    raffle_id: UUID
    raffle_nombre: str
    loteria_asociada: str
    numero_ganador_loteria: str | None
    serie_loteria: str | None
    fecha_resultado: date | None
    hay_ganador: bool
    ticket_ganador: str | None = None
    comprador_nombre: str | None = None
