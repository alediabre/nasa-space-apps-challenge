from fastapi import APIRouter, Request # ¡LA CORRECCIÓN ESTÁ AQUÍ!
from models.impact_models import KineticEnergyResponse, ImpactRequest,FireballResponse, FireballRequest,ThermalExposureAtDistanceRequest,ThermalExposureAtDistanceResponse
from services.impact_metrics import ImpactMetrics, Asteroid,joules_to_megatons

router = APIRouter(
    prefix="/energy",
    tags=["energy"]
)

@router.post("/kinetic_energy", response_model=KineticEnergyResponse,
            summary="Calculate kinetic energy")
def kinetic_energy(payload: ImpactRequest):
    asteroid = Asteroid(payload.diameter_m,payload.velocity_mps,payload.density_kgm3)
    k_energy = ImpactMetrics.kinetic_energy(asteroid)
    k_energy_mt = joules_to_megatons(k_energy)
    return KineticEnergyResponse(
        energy = k_energy,
        energy_mt = k_energy_mt
    )

@router.post("/fireball", response_model=FireballResponse,
             summary="Calculate fireball")
def fireball_radius(payload: FireballRequest):
    fireball_rad = ImpactMetrics.fireball_radius(payload.energy)
    return FireballResponse(
        fireball = fireball_rad

    )

@router.post("/thermal_exposure", response_model=ThermalExposureAtDistanceResponse,
             summary="Calculate exposure")
def thermal_exposure_at_distance(payload: ThermalExposureAtDistanceRequest):
    atmosfera = Atmosphere(payload.k_atenuacion,payload.burst_altitude_m)
    thermal_exp = ImpactMetrics.thermal_exposure_at_distance(payload.energy,payload.horizontal_distance_m,atmosfera,payload.eta)
    return ThermalExposureAtDistanceResponse(
        thermal_exposure = thermal_exp
    )