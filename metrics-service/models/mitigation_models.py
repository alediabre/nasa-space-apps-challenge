from pydantic import BaseModel 
from typing import Optional


class SuggestedMitigation(BaseModel):
    dv_mps: float
    direction: str
    when: str
    n_impactors: Optional[int] = None


class MitigationRequest(BaseModel):
    D_m: float                # diámetro en metros
    rho: float = 3000         # densidad en kg/m^3
    leadYears: float          # años de aviso
    vRel_kms: float = 7       # velocidad relativa km/s
    structure: Optional[str] = "unknown"  # rubble/cohesive/unknown
    binary: Optional[bool] = False
    miss_km: Optional[float] = 2000      # distancia nominal
    targetMiss_km: Optional[float] = 12742  # 2 radios terrestres

    beta: Optional[float] = 3
    mImp_kg: Optional[float] = 1200
    tractorMass_kg: Optional[float] = 20000
    tractorRange_m: Optional[float] = 150


class MitigationResponse(BaseModel):
    strategy: str
    confidence: str
    scores: dict[str, float]
    miss_nominal_km: float
    miss_after_mitigation_km: float
    suggested: SuggestedMitigation
    why: list[str]