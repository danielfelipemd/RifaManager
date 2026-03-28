from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class PurchaseRead(BaseModel):
    id: UUID
    tenant_id: UUID
    ticket_id: UUID
    raffle_id: UUID
    usuario_id: UUID | None
    comprador_nombre: str
    comprador_telefono: str | None
    comprador_email: str | None
    monto: Decimal
    metodo_pago: str | None
    notas: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
