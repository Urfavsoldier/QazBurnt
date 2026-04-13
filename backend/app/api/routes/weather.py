from fastapi import APIRouter, Depends, Query

from app.core.config import Settings, get_settings
from app.schemas import WeatherResponse
from app.services.weather import fetch_weather

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("/current", response_model=WeatherResponse)
async def current_weather(
    lat: float = Query(ge=40, le=56),
    lon: float = Query(ge=45, le=88),
    settings: Settings = Depends(get_settings),
) -> WeatherResponse:
    return await fetch_weather(settings, lat, lon)
