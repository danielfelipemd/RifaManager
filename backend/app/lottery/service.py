from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.lottery.models import LotteryProvider, LotteryResult
from app.lottery.schemas import CheckWinnerResponse, ScrapedResult
from app.lottery.scraper import parse_spanish_date, scrape_all_results
from app.raffles.models import Raffle
from app.tickets.models import Ticket


async def fetch_and_store_results(db: AsyncSession, tenant_id: UUID) -> list[LotteryResult]:
    """Scrape all lottery results and store new ones in DB."""
    scraped = await scrape_all_results()
    stored = []

    for result in scraped:
        parsed_date = parse_spanish_date(result.fecha)
        if not parsed_date:
            continue

        fecha = parsed_date.date()

        existing = await db.execute(
            select(LotteryResult).where(
                LotteryResult.tenant_id == tenant_id,
                LotteryResult.loteria == result.loteria,
                LotteryResult.fecha == fecha,
                LotteryResult.numero == result.numero,
            )
        )
        if existing.scalar_one_or_none():
            continue

        lottery_result = LotteryResult(
            tenant_id=tenant_id,
            loteria=result.loteria,
            numero=result.numero,
            fecha=fecha,
            serie=result.serie,
            raw_data={
                "sorteo": result.sorteo,
                "premio_mayor": result.premio_mayor,
            },
        )
        db.add(lottery_result)
        stored.append(lottery_result)

    if stored:
        await db.flush()

    return stored


async def fetch_and_check_winners(
    db: AsyncSession, tenant_id: UUID
) -> list[CheckWinnerResponse]:
    """
    Main flow: scrape results, store them, then auto-check ALL active raffles
    that have a loteria_asociada. Returns list of winner checks.
    """
    # Step 1: Fetch and store latest results
    await fetch_and_store_results(db, tenant_id)

    # Step 2: Get all active raffles with a lottery association
    raffles_result = await db.execute(
        select(Raffle).where(
            Raffle.tenant_id == tenant_id,
            Raffle.estado == "activa",
            Raffle.loteria_asociada.isnot(None),
            Raffle.loteria_asociada != "",
        )
    )
    active_raffles = raffles_result.scalars().all()

    # Step 3: Check each raffle for winners
    results = []
    for raffle in active_raffles:
        check = await check_raffle_winner(db, raffle.id, tenant_id)
        results.append(check)

    return results


async def check_raffle_winner(
    db: AsyncSession, raffle_id: UUID, tenant_id: UUID
) -> CheckWinnerResponse:
    """Check if a raffle has a winner based on lottery results."""
    raffle_result = await db.execute(
        select(Raffle).where(Raffle.id == raffle_id, Raffle.tenant_id == tenant_id)
    )
    raffle = raffle_result.scalar_one_or_none()
    if raffle is None:
        raise ValueError("Rifa no encontrada")

    if not raffle.loteria_asociada:
        raise ValueError("Esta rifa no tiene loteria asociada")

    # Find the most recent result for this lottery
    result = await db.execute(
        select(LotteryResult)
        .where(
            LotteryResult.tenant_id == tenant_id,
            LotteryResult.loteria == raffle.loteria_asociada,
        )
        .order_by(LotteryResult.fecha.desc())
        .limit(1)
    )
    lottery_result = result.scalar_one_or_none()

    if lottery_result is None:
        return CheckWinnerResponse(
            raffle_id=raffle.id,
            raffle_nombre=raffle.nombre,
            loteria_asociada=raffle.loteria_asociada,
            numero_ganador_loteria=None,
            serie_loteria=None,
            fecha_resultado=None,
            hay_ganador=False,
        )

    # Get the last N digits matching raffle's numero_digitos
    numero_loteria = lottery_result.numero
    ultimos_digitos = numero_loteria[-raffle.numero_digitos:].zfill(raffle.numero_digitos)

    # Search for a SOLD ticket with that number
    ticket_result = await db.execute(
        select(Ticket).where(
            Ticket.raffle_id == raffle.id,
            Ticket.numero == ultimos_digitos,
        )
    )
    winning_ticket = ticket_result.scalar_one_or_none()

    # Update raffle with winning number
    raffle.numero_ganador = ultimos_digitos

    hay_ganador = winning_ticket is not None and winning_ticket.estado == "vendido"

    response = CheckWinnerResponse(
        raffle_id=raffle.id,
        raffle_nombre=raffle.nombre,
        loteria_asociada=raffle.loteria_asociada,
        numero_ganador_loteria=numero_loteria,
        serie_loteria=lottery_result.serie,
        fecha_resultado=lottery_result.fecha,
        hay_ganador=hay_ganador,
        ticket_ganador=ultimos_digitos,
    )

    if hay_ganador and winning_ticket:
        response.comprador_nombre = winning_ticket.vendido_a_nombre
        response.comprador_telefono = winning_ticket.vendido_a_telefono
        response.comprador_email = winning_ticket.vendido_a_email
        response.ticket_estado = winning_ticket.estado

    await db.flush()
    return response


async def get_results_history(
    db: AsyncSession, tenant_id: UUID, loteria: str | None = None, limit: int = 50
) -> list[LotteryResult]:
    """Get stored lottery results."""
    query = select(LotteryResult).where(LotteryResult.tenant_id == tenant_id)
    if loteria:
        query = query.where(LotteryResult.loteria == loteria)
    query = query.order_by(LotteryResult.fecha.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
