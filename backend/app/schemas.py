from datetime import datetime, timezone
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field


class RiskLevel(StrEnum):
    low = "низкий"
    medium = "средний"
    high = "высокий"
    critical = "критический"


class TerrainType(StrEnum):
    steppe = "steppe"
    forest = "forest"
    mountainous = "mountainous"
    urban = "urban"


Mode = Literal["api", "mock"]


class FireDetection(BaseModel):
    id: str
    latitude: float = Field(ge=40, le=56)
    longitude: float = Field(ge=45, le=88)
    confidence: int = Field(ge=0, le=100)
    brightness: float | None = None
    frp: float | None = None
    satellite: str
    source: str
    timestamp: datetime
    distance_km: float | None = None


class FireLiveResponse(BaseModel):
    data: list[FireDetection]
    mode: Mode
    count: int
    center: tuple[float, float]
    radius_km: float
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WeatherCurrent(BaseModel):
    latitude: float
    longitude: float
    temperature_2m: float
    relative_humidity_2m: int = Field(ge=0, le=100)
    wind_speed_10m: float = Field(ge=0)
    wind_direction_10m: int = Field(ge=0, le=359)
    precipitation: float = Field(ge=0)
    observed_at: datetime


class WeatherHourlyPoint(BaseModel):
    time: datetime
    temperature_2m: float
    relative_humidity_2m: int
    wind_speed_10m: float
    wind_direction_10m: int
    precipitation: float


class WeatherResponse(BaseModel):
    current: WeatherCurrent
    hourly_24h: list[WeatherHourlyPoint]
    mode: Mode


class RiskFactor(BaseModel):
    value: float
    weight: float
    contribution: float
    explanation: str


class RiskPredictionResponse(BaseModel):
    probability_percent: int = Field(ge=0, le=100)
    risk_label: RiskLevel
    explanation: dict[str, RiskFactor]
    nearest_hotspot_distance_km: float | None
    hotspot_count: int
    recommendation: str
    mode: Mode


class RiskScoreRequest(BaseModel):
    region: str = "Выбранная точка"
    fire_confidence: int = Field(ge=0, le=100)
    temperature_c: float = Field(ge=-40, le=60)
    humidity_pct: int = Field(ge=0, le=100)
    wind_speed_kmh: float = Field(ge=0, le=120)
    dryness_pct: int | None = Field(default=None, ge=0, le=100)
    terrain_factor: float = Field(default=1, ge=0.2, le=2.5)
    active_hotspots: int = Field(default=0, ge=0)


class RiskScoreResponse(BaseModel):
    region: str
    score: int = Field(ge=0, le=100)
    risk: RiskLevel
    label: RiskLevel
    confidence: int = Field(ge=0, le=100)
    drivers: list[str]
    components: list[RiskFactor]
    recommendation: str


class SimulationRequest(BaseModel):
    ignition_lat: float = Field(ge=40, le=56)
    ignition_lon: float = Field(ge=45, le=88)
    wind_speed_kmh: float = Field(ge=0, le=120)
    wind_direction_deg: int = Field(ge=0, le=359)
    temperature_c: float = Field(ge=-40, le=60)
    relative_humidity_pct: int = Field(ge=0, le=100)
    precipitation_mm: float = Field(default=0, ge=0)
    terrain_type: TerrainType = TerrainType.steppe
    forecast_hours: Literal[6, 12, 24] = 24


class ThreatenedSettlement(BaseModel):
    name: str
    region: str
    distance_km: int
    eta_hours: int
    population: int


class ForecastLayer(BaseModel):
    hours: Literal[6, 12, 24]
    polygon: list[tuple[float, float]]
    forward_km: float
    side_km: float
    rear_km: float
    area_km2: float


class SimulationResponse(BaseModel):
    ignition: tuple[float, float]
    wind_direction_deg: int
    risk_label: RiskLevel
    probability_percent: int = Field(ge=0, le=100)
    layers: list[ForecastLayer]
    affected_area_km2: float
    impacted_settlements: list[ThreatenedSettlement]
    explanation: dict[str, float | str]
    mode: Mode


# Compatibility names for older app code paths.
FireEvent = FireDetection
FireEventResponse = FireLiveResponse
SimulationApiResponse = SimulationResponse
RiskPredictionRequest = RiskScoreRequest
