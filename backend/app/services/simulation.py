import math

from app.schemas import ForecastLayer, RiskLevel, SimulationRequest, SimulationResponse, TerrainType, ThreatenedSettlement
from app.services.geo import SETTLEMENTS, clamp, ellipse_polygon, haversine_km, normalize
from app.services.risk_engine import classify_risk


TERRAIN_PROFILE = {
    TerrainType.steppe: {"speed": 1.22, "intensity": 0.95, "irregularity": 0.04, "label": "степь"},
    TerrainType.forest: {"speed": 1.08, "intensity": 1.25, "irregularity": 0.07, "label": "лесной массив"},
    TerrainType.mountainous: {"speed": 0.78, "intensity": 1.05, "irregularity": 0.13, "label": "горный рельеф"},
    TerrainType.urban: {"speed": 0.55, "intensity": 0.62, "irregularity": 0.03, "label": "городская зона"},
}


def spread_rate_kmh(payload: SimulationRequest) -> float:
    terrain = TERRAIN_PROFILE[payload.terrain_type]
    heat = 0.55 + normalize(payload.temperature_c, 8, 42) * 0.95
    dryness = 0.55 + ((100 - payload.relative_humidity_pct) / 100) * 1.15
    wind = 0.72 + normalize(payload.wind_speed_kmh, 0, 55) * 1.4
    rain_suppression = max(0.25, 1 - min(payload.precipitation_mm, 8) * 0.105)
    return max(0.12, 0.42 * heat * dryness * wind * terrain["speed"] * rain_suppression)


def risk_probability(payload: SimulationRequest) -> int:
    dryness = 100 - payload.relative_humidity_pct
    score = (
        normalize(payload.temperature_c, 8, 42) * 27
        + normalize(payload.wind_speed_kmh, 0, 55) * 25
        + dryness * 0.28
        + TERRAIN_PROFILE[payload.terrain_type]["intensity"] * 13
        - normalize(payload.precipitation_mm, 0, 6) * 14
    )
    return round(clamp(score, 0, 100))


def layer_for(payload: SimulationRequest, hours: int, rate: float) -> ForecastLayer:
    wind_multiplier = 1 + min(payload.wind_speed_kmh, 70) / 48
    forward = rate * hours * wind_multiplier
    rear = max(0.25, rate * hours * (0.38 + max(0, 22 - payload.wind_speed_kmh) / 80))
    side = max(0.25, rate * hours * (0.56 + (100 - payload.relative_humidity_pct) / 250))
    polygon = ellipse_polygon(
        (payload.ignition_lat, payload.ignition_lon),
        payload.wind_direction_deg,
        forward,
        side,
        rear,
        irregularity=float(TERRAIN_PROFILE[payload.terrain_type]["irregularity"]),
    )
    area = math.pi * ((forward + rear) / 2) * side
    return ForecastLayer(
        hours=hours,  # type: ignore[arg-type]
        polygon=polygon,
        forward_km=round(forward, 2),
        side_km=round(side, 2),
        rear_km=round(rear, 2),
        area_km2=round(area, 2),
    )


def impacted_settlements(payload: SimulationRequest, selected_layer: ForecastLayer, rate: float) -> list[ThreatenedSettlement]:
    origin = (payload.ignition_lat, payload.ignition_lon)
    threat_radius = max(selected_layer.forward_km, selected_layer.side_km) * 1.1
    villages: list[ThreatenedSettlement] = []
    for settlement in SETTLEMENTS:
        distance = haversine_km(origin, (settlement.latitude, settlement.longitude))
        if distance <= threat_radius:
            villages.append(
                ThreatenedSettlement(
                    name=settlement.name,
                    region=settlement.region,
                    distance_km=round(distance),
                    eta_hours=max(1, round(distance / max(rate, 0.3))),
                    population=settlement.population,
                )
            )
    return sorted(villages, key=lambda item: item.eta_hours)


def run_simulation(payload: SimulationRequest, mode: str = "api") -> SimulationResponse:
    rate = spread_rate_kmh(payload)
    layers = [layer_for(payload, hours, rate) for hours in (6, 12, 24)]
    selected_layer = next(layer for layer in layers if layer.hours == payload.forecast_hours)
    probability = risk_probability(payload)
    label = classify_risk(probability)
    terrain = TERRAIN_PROFILE[payload.terrain_type]
    settlements = impacted_settlements(payload, selected_layer, rate)
    rain_suppression = max(0.25, 1 - min(payload.precipitation_mm, 8) * 0.105)

    return SimulationResponse(
        ignition=(payload.ignition_lat, payload.ignition_lon),
        wind_direction_deg=payload.wind_direction_deg,
        risk_label=label,
        probability_percent=probability,
        layers=layers,
        affected_area_km2=selected_layer.area_km2,
        impacted_settlements=settlements,
        explanation={
            "base_spread_rate_kmh": round(rate, 2),
            "terrain": str(terrain["label"]),
            "wind_forward_multiplier": round(1 + min(payload.wind_speed_kmh, 70) / 48, 2),
            "dryness_pct": 100 - payload.relative_humidity_pct,
            "rain_suppression": round(rain_suppression, 2),
            "model": "directional_ellipse",
        },
        mode="mock" if mode == "mock" else "api",
    )
