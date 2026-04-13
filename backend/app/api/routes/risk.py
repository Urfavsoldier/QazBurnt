from fastapi import APIRouter, Depends, Query

from app.core.config import Settings, get_settings
from app.schemas import RiskPredictionResponse, RiskScoreRequest, RiskScoreResponse
from app.services.firms import fetch_live_fires
from app.services.risk_engine import calculate_prediction, calculate_score
from app.services.weather import fetch_weather

router = APIRouter(prefix="/risk", tags=["risk"])


@router.get("/predict", response_model=RiskPredictionResponse)
async def risk_predict(
    lat: float = Query(ge=40, le=56),
    lon: float = Query(ge=45, le=88),
    radius_km: float = Query(default=150, ge=5, le=1500),
    settings: Settings = Depends(get_settings),
) -> RiskPredictionResponse:
    fires, fire_mode = await fetch_live_fires(settings, lat, lon, radius_km)
    weather = await fetch_weather(settings, lat, lon)
    mode = "mock" if fire_mode == "mock" or weather.mode == "mock" else "api"
    return calculate_prediction(lat, lon, radius_km, fires, weather.current, mode)


@router.post("/score", response_model=RiskScoreResponse)
async def risk_score(payload: RiskScoreRequest) -> RiskScoreResponse:
    return calculate_score(payload)
