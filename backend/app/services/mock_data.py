from datetime import datetime, timedelta, timezone

from app.schemas import FireDetection, WeatherCurrent, WeatherHourlyPoint, WeatherResponse
from app.services.geo import haversine_km


MOCK_FIRE_POINTS = [
    ("qb-001", 50.02, 79.48, 94, 336.8, 64.2, "VIIRS", "VIIRS_SNPP_NRT", 1),
    ("qb-002", 50.32, 78.64, 88, 329.4, 52.1, "MODIS", "MODIS_NRT", 4),
    ("qb-003", 51.64, 73.12, 83, 323.1, 41.7, "VIIRS", "VIIRS_NOAA20_NRT", 8),
    ("qb-004", 51.54, 64.18, 79, 319.7, 34.5, "MODIS", "MODIS_NRT", 13),
    ("qb-005", 44.18, 68.79, 73, 315.6, 28.8, "VIIRS", "VIIRS_SNPP_NRT", 18),
    ("qb-006", 45.57, 75.33, 67, 312.4, 23.3, "MODIS", "MODIS_NRT", 29),
    ("qb-007", 49.55, 49.14, 61, 309.8, 17.4, "VIIRS", "VIIRS_SNPP_NRT", 44),
    ("qb-008", 50.78, 75.69, 82, 326.2, 44.6, "VIIRS", "VIIRS_SNPP_NRT", 6),
    ("qb-009", 49.18, 85.62, 90, 333.5, 58.0, "MODIS", "MODIS_NRT", 3),
]


def mock_fire_detections(
    center: tuple[float, float] = (48.2, 67.4),
    radius_km: float = 950,
) -> list[FireDetection]:
    now = datetime.now(timezone.utc)
    events: list[FireDetection] = []
    for fire_id, lat, lon, confidence, brightness, frp, satellite, source, hours_ago in MOCK_FIRE_POINTS:
        distance = haversine_km(center, (lat, lon))
        if distance <= radius_km:
            events.append(
                FireDetection(
                    id=fire_id,
                    latitude=lat,
                    longitude=lon,
                    confidence=confidence,
                    brightness=brightness,
                    frp=frp,
                    satellite=satellite,
                    source=source,
                    timestamp=now - timedelta(hours=hours_ago),
                    distance_km=round(distance, 1),
                )
            )
    return sorted(events, key=lambda item: item.distance_km if item.distance_km is not None else 9999)


def mock_weather(lat: float, lon: float) -> WeatherResponse:
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    south_heat = max(0, 48.0 - lat) * 0.9
    east_wind = max(0, lon - 70.0) * 0.18
    temperature = round(24.0 + south_heat + east_wind, 1)
    humidity = max(16, min(62, round(42 - south_heat * 1.4 + (lat - 46) * 0.7)))
    wind_speed = round(14 + east_wind * 1.8 + max(0, lat - 48) * 0.9, 1)
    wind_direction = int((65 + lon * 1.7) % 360)
    precipitation = 0.0 if humidity < 50 else 0.3

    hourly: list[WeatherHourlyPoint] = []
    for hour in range(24):
        daily_wave = 3.5 if 9 <= hour <= 17 else -1.4
        hourly.append(
            WeatherHourlyPoint(
                time=now + timedelta(hours=hour),
                temperature_2m=round(temperature + daily_wave * (1 - abs(13 - hour) / 13), 1),
                relative_humidity_2m=max(10, min(90, humidity + (5 if hour < 7 else -4))),
                wind_speed_10m=round(wind_speed + (hour % 6) * 0.6, 1),
                wind_direction_10m=(wind_direction + hour * 3) % 360,
                precipitation=precipitation if hour in (3, 4, 19) else 0.0,
            )
        )

    return WeatherResponse(
        current=WeatherCurrent(
            latitude=lat,
            longitude=lon,
            temperature_2m=temperature,
            relative_humidity_2m=humidity,
            wind_speed_10m=wind_speed,
            wind_direction_10m=wind_direction,
            precipitation=precipitation,
            observed_at=now,
        ),
        hourly_24h=hourly,
        mode="mock",
    )
