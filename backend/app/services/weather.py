from datetime import datetime, timezone
from typing import Any

import httpx

from app.core.config import Settings
from app.schemas import WeatherCurrent, WeatherHourlyPoint, WeatherResponse
from app.services.mock_data import mock_weather


def parse_time(raw: str | None) -> datetime:
    if not raw:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return datetime.now(timezone.utc)


def current_from_payload(payload: dict[str, Any], lat: float, lon: float) -> WeatherCurrent:
    current = payload.get("current") or {}
    return WeatherCurrent(
        latitude=lat,
        longitude=lon,
        temperature_2m=round(float(current.get("temperature_2m", 26.0)), 1),
        relative_humidity_2m=round(float(current.get("relative_humidity_2m", 35))),
        wind_speed_10m=round(float(current.get("wind_speed_10m", 12.0)), 1),
        wind_direction_10m=round(float(current.get("wind_direction_10m", 90))) % 360,
        precipitation=max(0.0, round(float(current.get("precipitation", 0.0)), 2)),
        observed_at=parse_time(current.get("time")),
    )


def hourly_from_payload(payload: dict[str, Any]) -> list[WeatherHourlyPoint]:
    hourly = payload.get("hourly") or {}
    times = hourly.get("time") or []
    temperatures = hourly.get("temperature_2m") or []
    humidity = hourly.get("relative_humidity_2m") or []
    wind_speed = hourly.get("wind_speed_10m") or []
    wind_direction = hourly.get("wind_direction_10m") or []
    precipitation = hourly.get("precipitation") or []

    points: list[WeatherHourlyPoint] = []
    for index, raw_time in enumerate(times[:24]):
        points.append(
            WeatherHourlyPoint(
                time=parse_time(raw_time),
                temperature_2m=round(float(temperatures[index]), 1),
                relative_humidity_2m=round(float(humidity[index])),
                wind_speed_10m=round(float(wind_speed[index]), 1),
                wind_direction_10m=round(float(wind_direction[index])) % 360,
                precipitation=max(0.0, round(float(precipitation[index]), 2)),
            )
        )
    return points


async def fetch_weather(settings: Settings, lat: float, lon: float) -> WeatherResponse:
    if settings.mock_mode:
        return mock_weather(lat, lon)

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation",
        "hourly": "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation",
        "forecast_days": 2,
        "timezone": "UTC",
    }

    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.get(str(settings.open_meteo_url), params=params)
            response.raise_for_status()
        payload = response.json()
        return WeatherResponse(
            current=current_from_payload(payload, lat, lon),
            hourly_24h=hourly_from_payload(payload),
            mode="api",
        )
    except Exception:
        if not settings.mock_fallback:
            raise
        return mock_weather(lat, lon)
