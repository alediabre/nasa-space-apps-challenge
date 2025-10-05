from fastapi import APIRouter
from pydantic import BaseModel

from services.population_service import estimate_population

router = APIRouter(
    prefix="/population",
    tags=["population"]
)

# --- Models ---
class PopulationRequest(BaseModel):
    lat: float
    lon: float
    radius_m: float

class PopulationResponse(BaseModel):
    lat: float
    lon: float
    radius_m: float
    population_estimate: float


@router.post("/estimate", response_model=PopulationResponse,
            summary="Estimate population within a circle",
            description="""
                Returns the estimated population within a circle defined by
                latitude/longitude/radius in meters.
                Coordinates are in WGS84.
                """
            )
def population(payload: PopulationRequest):
    pop_est = estimate_population(payload.lon, payload.lat, payload.radius_m)
    return PopulationResponse(
        lat=payload.lat,
        lon=payload.lon,
        radius_m=payload.radius_m,
        population_estimate=pop_est,
    )