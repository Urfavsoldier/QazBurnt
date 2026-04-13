from fastapi import APIRouter

from app.schemas import SimulationRequest, SimulationResponse
from app.services.simulation import run_simulation

router = APIRouter(prefix="/simulation", tags=["simulation"])


@router.post("/run", response_model=SimulationResponse)
async def simulation_run(payload: SimulationRequest) -> SimulationResponse:
    return run_simulation(payload)
