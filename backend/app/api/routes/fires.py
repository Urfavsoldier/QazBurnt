from fastapi import APIRouter, Depends, Query

from app.core.config import Settings, get_settings
from app.schemas import FireLiveResponse
from app.services.firms import fetch_live_fires
from app.services.geo import KAZAKHSTAN_CENTER
from app.services.repository import FireEventRepository

router = APIRouter(prefix="/fires", tags=["fires"])


def get_repository(settings: Settings = Depends(get_settings)) -> FireEventRepository:
    return FireEventRepository(settings.data_dir)


@router.get("/live", response_model=FireLiveResponse)
async def live_fires(
    lat: float | None = Query(default=None, ge=40, le=56),
    lon: float | None = Query(default=None, ge=45, le=88),
    radius_km: float = Query(default=150, ge=5, le=1500),
    settings: Settings = Depends(get_settings),
    repository: FireEventRepository = Depends(get_repository),
) -> FireLiveResponse:
    events, mode = await fetch_live_fires(settings, lat, lon, radius_km)
    repository.upsert_many(events)
    center = (lat, lon) if lat is not None and lon is not None else KAZAKHSTAN_CENTER
    response_radius = radius_km if lat is not None and lon is not None else 1300
    return FireLiveResponse(data=events, count=len(events), mode=mode, center=center, radius_km=response_radius)


@router.get("/history", response_model=FireLiveResponse)
async def fire_history(
    hours: int = Query(default=72, ge=1, le=720),
    limit: int = Query(default=250, ge=1, le=1000),
    repository: FireEventRepository = Depends(get_repository),
) -> FireLiveResponse:
    events = repository.recent(hours=hours, limit=limit)
    return FireLiveResponse(data=events, count=len(events), mode="api", center=KAZAKHSTAN_CENTER, radius_km=1300)
