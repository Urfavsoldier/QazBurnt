from app.schemas import (
    FireDetection,
    RiskFactor,
    RiskLevel,
    RiskPredictionResponse,
    RiskScoreRequest,
    RiskScoreResponse,
    WeatherCurrent,
)
from app.services.geo import clamp, haversine_km, normalize


RISK_THRESHOLDS = (
    (82, RiskLevel.critical),
    (60, RiskLevel.high),
    (35, RiskLevel.medium),
    (0, RiskLevel.low),
)


def classify_risk(score: int) -> RiskLevel:
    for threshold, label in RISK_THRESHOLDS:
        if score >= threshold:
            return label
    return RiskLevel.low


def recommendation_for(label: RiskLevel) -> str:
    return {
        RiskLevel.critical: "Немедленно поднять оперативный штаб, проверить эвакуационные маршруты и усилить патрулирование.",
        RiskLevel.high: "Усилить наблюдение, подготовить мобильные группы и обновлять ветровой прогноз каждый час.",
        RiskLevel.medium: "Продолжать спутниковый контроль и держать резерв реагирования в готовности.",
        RiskLevel.low: "Плановый мониторинг без немедленных мер эвакуации.",
    }[label]


def hotspot_factor(
    lat: float,
    lon: float,
    radius_km: float,
    detections: list[FireDetection],
) -> tuple[float, float | None, int]:
    if not detections:
        return 0, None, 0

    center = (lat, lon)
    distances = [haversine_km(center, (item.latitude, item.longitude)) for item in detections]
    nearest = min(distances)
    score = 0.0
    for detection, distance in zip(detections, distances, strict=True):
        proximity = max(0.0, 1.0 - distance / max(radius_km, 1))
        close_boost = 1.35 if distance <= 15 else 1.0
        score += proximity * (detection.confidence / 100) * 100 * close_boost
    return clamp(score / max(1.6, len(detections) * 0.72), 0, 100), round(nearest, 1), len(detections)


def calculate_prediction(
    lat: float,
    lon: float,
    radius_km: float,
    detections: list[FireDetection],
    weather: WeatherCurrent,
    mode: str,
) -> RiskPredictionResponse:
    hotspot_value, nearest, count = hotspot_factor(lat, lon, radius_km, detections)
    temperature_value = normalize(weather.temperature_2m, 8, 42) * 100
    wind_value = normalize(weather.wind_speed_10m, 0, 55) * 100
    dryness_value = clamp(100 - weather.relative_humidity_2m, 0, 100)
    rain_value = normalize(weather.precipitation, 0, 6) * 100

    # Explainable weighted model:
    # risk = hotspots + heat + wind + dryness - rain suppression.
    # Each factor is normalized to 0..100 so operators can inspect why a point is risky.
    weights = {
        "hotspot_factor": 0.35,
        "temperature_factor": 0.25,
        "wind_factor": 0.20,
        "dryness_factor": 0.15,
        "rain_penalty": 0.05,
    }
    contributions = {
        "hotspot_factor": hotspot_value * weights["hotspot_factor"],
        "temperature_factor": temperature_value * weights["temperature_factor"],
        "wind_factor": wind_value * weights["wind_factor"],
        "dryness_factor": dryness_value * weights["dryness_factor"],
        "rain_penalty": -rain_value * weights["rain_penalty"],
    }
    score = round(clamp(sum(contributions.values()), 0, 100))
    label = classify_risk(score)

    explanation = {
        "hotspot_factor": RiskFactor(
            value=round(hotspot_value, 2),
            weight=weights["hotspot_factor"],
            contribution=round(contributions["hotspot_factor"], 2),
            explanation="Ближайшие активные термоточки NASA FIRMS с учетом расстояния и уверенности детекции.",
        ),
        "temperature_factor": RiskFactor(
            value=round(weather.temperature_2m, 1),
            weight=weights["temperature_factor"],
            contribution=round(contributions["temperature_factor"], 2),
            explanation="Высокая температура ускоряет высыхание топлива и повышает вероятность активного горения.",
        ),
        "wind_factor": RiskFactor(
            value=round(weather.wind_speed_10m, 1),
            weight=weights["wind_factor"],
            contribution=round(contributions["wind_factor"], 2),
            explanation="Сильный ветер ускоряет фронт пожара и перенос искр по направлению ветра.",
        ),
        "dryness_factor": RiskFactor(
            value=round(dryness_value, 1),
            weight=weights["dryness_factor"],
            contribution=round(contributions["dryness_factor"], 2),
            explanation="Низкая влажность воздуха повышает сухость растительности.",
        ),
        "rain_penalty": RiskFactor(
            value=round(weather.precipitation, 2),
            weight=weights["rain_penalty"],
            contribution=round(contributions["rain_penalty"], 2),
            explanation="Осадки подавляют риск и замедляют распространение огня.",
        ),
    }

    return RiskPredictionResponse(
        probability_percent=score,
        risk_label=label,
        explanation=explanation,
        nearest_hotspot_distance_km=nearest,
        hotspot_count=count,
        recommendation=recommendation_for(label),
        mode="mock" if mode == "mock" else "api",
    )


def calculate_score(payload: RiskScoreRequest) -> RiskScoreResponse:
    dryness = payload.dryness_pct if payload.dryness_pct is not None else max(0, 100 - payload.humidity_pct)
    confidence = payload.fire_confidence
    temperature = normalize(payload.temperature_c, 8, 42) * 100
    wind = normalize(payload.wind_speed_kmh, 0, 55) * 100
    terrain = normalize(payload.terrain_factor, 0.5, 1.7) * 100
    hotspot_bonus = min(payload.active_hotspots, 8) * 1.4
    score = round(clamp(confidence * 0.28 + temperature * 0.22 + wind * 0.2 + dryness * 0.2 + terrain * 0.1 + hotspot_bonus, 0, 100))
    label = classify_risk(score)
    drivers = [
        "спутниковый сигнал имеет высокую уверенность" if confidence >= 80 else "спутниковый сигнал умеренный",
        "ветер способен быстро сместить фронт" if payload.wind_speed_kmh >= 24 else "ветер не доминирует в сценарии",
        "сухость топлива повышает интенсивность" if dryness >= 65 else "влажность частично ограничивает распространение",
    ]
    return RiskScoreResponse(
        region=payload.region,
        score=score,
        risk=label,
        label=label,
        confidence=min(96, 58 + round(confidence * 0.18) + payload.active_hotspots * 3),
        drivers=drivers,
        components=[
            RiskFactor(value=confidence, weight=0.28, contribution=round(confidence * 0.28, 2), explanation="Уверенность спутниковой термоточки."),
            RiskFactor(value=payload.temperature_c, weight=0.22, contribution=round(temperature * 0.22, 2), explanation="Температура воздуха."),
            RiskFactor(value=payload.wind_speed_kmh, weight=0.20, contribution=round(wind * 0.20, 2), explanation="Скорость ветра."),
            RiskFactor(value=dryness, weight=0.20, contribution=round(dryness * 0.20, 2), explanation="Сухость топлива."),
            RiskFactor(value=payload.terrain_factor, weight=0.10, contribution=round(terrain * 0.10, 2), explanation="Поправка на рельеф."),
        ],
        recommendation=recommendation_for(label),
    )
