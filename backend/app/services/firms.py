import csv
import io
from datetime import datetime, timezone

import httpx

from app.core.config import Settings
from app.schemas import FireDetection
from app.services.geo import KAZAKHSTAN_CENTER, bbox_around, haversine_km
from app.services.mock_data import mock_fire_detections


FIRMS_AREA_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"


def parse_confidence(raw: str | None) -> int:
    if not raw:
        return 65
    normalized = raw.strip().lower()
    if normalized in {"l", "low"}:
        return 35
    if normalized in {"n", "nominal", "medium"}:
        return 65
    if normalized in {"h", "high"}:
        return 90
    try:
        return max(0, min(100, round(float(normalized))))
    except ValueError:
        return 65


def parse_float(raw: str | None) -> float | None:
    if raw is None or raw == "":
        return None
    try:
        return float(raw)
    except ValueError:
        return None


def parse_timestamp(row: dict[str, str]) -> datetime:
    date_text = row.get("acq_date") or row.get("date")
    time_text = (row.get("acq_time") or row.get("time") or "0000").zfill(4)
    if date_text:
        try:
            return datetime.strptime(f"{date_text} {time_text}", "%Y-%m-%d %H%M").replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def normalize_firms_rows(rows: list[dict[str, str]], center: tuple[float, float], radius_km: float) -> list[FireDetection]:
    detections: list[FireDetection] = []
    for index, row in enumerate(rows):
        lat = parse_float(row.get("latitude"))
        lon = parse_float(row.get("longitude"))
        if lat is None or lon is None:
            continue
        distance = haversine_km(center, (lat, lon))
        if distance > radius_km:
            continue
        satellite = row.get("satellite") or row.get("instrument") or "FIRMS"
        source = row.get("source") or row.get("instrument") or satellite
        timestamp = parse_timestamp(row)
        detection_id = row.get("id") or f"firms-{timestamp:%Y%m%d%H%M}-{index}-{lat:.3f}-{lon:.3f}"
        detections.append(
            FireDetection(
                id=detection_id,
                latitude=lat,
                longitude=lon,
                confidence=parse_confidence(row.get("confidence")),
                brightness=parse_float(row.get("bright_ti4") or row.get("brightness") or row.get("bright_t31")),
                frp=parse_float(row.get("frp")),
                satellite=satellite,
                source=source,
                timestamp=timestamp,
                distance_km=round(distance, 1),
            )
        )
    return sorted(detections, key=lambda item: item.distance_km if item.distance_km is not None else 9999)


async def fetch_live_fires(
    settings: Settings,
    lat: float | None = None,
    lon: float | None = None,
    radius_km: float = 150,
    days: int = 1,
) -> tuple[list[FireDetection], str]:
    center = (lat, lon) if lat is not None and lon is not None else KAZAKHSTAN_CENTER
    query_radius = radius_km if lat is not None and lon is not None else 1300

    if settings.mock_mode or not settings.firms_map_key:
        return mock_fire_detections(center, query_radius), "mock"

    west, south, east, north = bbox_around(center[0], center[1], query_radius)
    area = f"{west:.4f},{south:.4f},{east:.4f},{north:.4f}"
    url = f"{FIRMS_AREA_URL}/{settings.firms_map_key}/{settings.firms_source}/{area}/{days}"

    try:
        async with httpx.AsyncClient(timeout=14) as client:
            response = await client.get(url)
            response.raise_for_status()
        rows = list(csv.DictReader(io.StringIO(response.text)))
        detections = normalize_firms_rows(rows, center, query_radius)
        return detections, "api"
    except Exception:
        if not settings.mock_fallback:
            raise
        return mock_fire_detections(center, query_radius), "mock"
