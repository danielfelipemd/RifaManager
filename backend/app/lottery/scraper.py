import re
from datetime import datetime

import httpx

from app.config import settings
from app.lottery.schemas import ScrapedResult

BROWSERLESS_URL = settings.BROWSERLESS_URL
BROWSERLESS_TOKEN = settings.BROWSERLESS_TOKEN
AGGREGATOR_URL = "https://loteriasdehoy.co/"


async def scrape_all_results() -> list[ScrapedResult]:
    """Scrape all lottery results from loteriasdehoy.co aggregator."""
    html = await _fetch_rendered_html(AGGREGATOR_URL)
    if not html or len(html) < 500:
        return []
    return _parse_aggregator_html(html)


async def scrape_lottery_by_slug(slug: str) -> ScrapedResult | None:
    """Scrape a single lottery result from the aggregator."""
    results = await scrape_all_results()
    for r in results:
        if _normalize_slug(r.loteria) == slug:
            return r
    return None


async def _fetch_rendered_html(url: str) -> str:
    """Use Browserless to render JavaScript and return HTML."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                f"{BROWSERLESS_URL}/content",
                params={"token": BROWSERLESS_TOKEN},
                json={
                    "url": url,
                    "gotoOptions": {"waitUntil": "networkidle2", "timeout": 30000},
                },
            )
            response.raise_for_status()
            return response.text
        except Exception:
            return ""


def _parse_aggregator_html(html: str) -> list[ScrapedResult]:
    """Parse the loteriasdehoy.co HTML structure."""
    results = []

    # Split by lottery result blocks
    blocks = re.split(r'<div class="loterias_resultados">', html)

    for block in blocks[1:]:  # Skip first (before any result)
        try:
            # Extract lottery name
            name_match = re.search(r'<h3><a[^>]*title="([^"]+)"', block)
            if not name_match:
                name_match = re.search(r'<h3><a[^>]*>([^<]+)</a></h3>', block)
            if not name_match:
                continue
            nombre = name_match.group(1).strip()

            # Extract date
            date_match = re.search(r'class="fecha_resultado">([^<]+)<', block)
            fecha = date_match.group(1).strip() if date_match else ""

            # Extract winning number digits (premio1 class)
            number_digits = re.findall(r'class="redondoc premio1">(\d)</span>', block)
            numero = "".join(number_digits)

            # Extract serie digits (serie1 class)
            serie_digits = re.findall(r'class="redondoc serie1">(\d)</span>', block)
            serie = "".join(serie_digits) if serie_digits else None

            # Extract sorteo number
            sorteo_match = re.search(r'class="sorteo_resultado">[^<]*?(\d+)', block)
            sorteo = sorteo_match.group(1) if sorteo_match else None

            # Extract premio mayor
            premio_match = re.search(r'class="premio_mayor">([^<]+)<', block)
            premio = premio_match.group(1).strip() if premio_match else None

            if numero:
                results.append(ScrapedResult(
                    loteria=nombre,
                    numero=numero,
                    serie=serie,
                    fecha=fecha,
                    sorteo=sorteo,
                    premio_mayor=premio,
                ))
        except Exception:
            continue

    return results


def _normalize_slug(nombre: str) -> str:
    """Convert lottery name to slug format."""
    slug = nombre.lower().strip()
    slug = slug.replace("á", "a").replace("é", "e").replace("í", "i")
    slug = slug.replace("ó", "o").replace("ú", "u").replace("ñ", "n")
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug


def parse_spanish_date(fecha_str: str) -> datetime | None:
    """Parse dates like '27 Marzo 2026' or '28 de marzo de 2026'."""
    meses = {
        "enero": 1, "febrero": 2, "marzo": 3, "abril": 4,
        "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
        "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
    }
    fecha_str = fecha_str.lower().replace(" de ", " ").strip()
    parts = fecha_str.split()
    if len(parts) >= 3:
        try:
            dia = int(parts[0])
            mes = meses.get(parts[1])
            anio = int(parts[2])
            if mes:
                return datetime(anio, mes, dia)
        except (ValueError, IndexError):
            pass
    return None
