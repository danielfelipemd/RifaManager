from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TicketRead(BaseModel):
    id: UUID
    raffle_id: UUID
    numero: str
    estado: str
    reservado_por: UUID | None
    reservado_hasta: datetime | None
    vendido_a_nombre: str | None
    vendido_a_telefono: str | None
    vendido_a_email: str | None

    model_config = {"from_attributes": True}


class TicketSummary(BaseModel):
    total: int
    disponibles: int
    reservados: int
    vendidos: int


class BuyerInfo(BaseModel):
    nombre: str
    telefono: str | None = None
    email: str | None = None
    metodo_pago: str | None = None
    notas: str | None = None


class BulkPurchaseRequest(BaseModel):
    ticket_ids: list[UUID]
    buyer: BuyerInfo
