from fastapi import APIRouter
from models.mitigation_models import MitigationRequest, MitigationResponse
from services.mitigation_metrics import MitigationMetrics
import math

router = APIRouter(
    prefix="/mitigation",
    tags=["mitigation"]
)

@router.post("/recommend", response_model=MitigationResponse,
             summary="Recommend mitigation strategy for asteroid deflection")
def recommend_strategy(payload: MitigationRequest):

    metrics = MitigationMetrics(
        D_m=payload.D_m,
        rho=payload.rho,
        lead_years=payload.leadYears,
        vRel_kms=payload.vRel_kms
    )

    dv_need = metrics.dv_needed(payload.targetMiss_km)
    dv_imp = metrics.dv_per_impactor(payload.mImp_kg, payload.beta)
    n_imp = max(1, math.ceil(dv_need / dv_imp))
    dvTrac_year, dvTrac_tot = metrics.dv_tractor(payload.tractorMass_kg, payload.tractorRange_m)

    miss_new = metrics.miss_distance_after_dv(payload.miss_km, dv_need)

    # --- reglas y puntuaciones ---
    scores = {"kinetic": 0, "tractor": 0, "standoff": 0, "civil": 0}
    why = []

    # tiempo de aviso
    if payload.leadYears > 10:
        scores["tractor"] += 0.6; scores["kinetic"] += 0.3
        why.append("Más de 10 años: tractor o impactador recomendados.")
    elif 3 <= payload.leadYears <= 10:
        scores["kinetic"] += 0.8
        why.append("Entre 3 y 10 años: impactador recomendado.")
    else:
        scores["standoff"] += 0.6
        why.append("Menos de 3 años: solo standoff o protección civil.")

    # tamaño
    if payload.D_m < 70:
        scores["civil"] += 1.0
        why.append("Asteroide <70m: se fragmenta en atmósfera → protección civil.")
    elif payload.D_m <= 300:
        scores["kinetic"] += 0.2
    elif payload.D_m > 500:
        scores["tractor"] += 0.3; scores["kinetic"] -= 0.1

    # estructura
    if payload.structure == "rubble":
        scores["kinetic"] -= 0.2; scores["tractor"] += 0.1
        why.append("Rubble-pile: impacto menos predecible.")
    elif payload.structure == "cohesive":
        scores["kinetic"] += 0.1

    # binario
    if payload.binary: 
        scores["tractor"] -= 0.1
        why.append("Binario: tractor difícil de operar.")

    # elegir mejor
    best = max(scores, key=scores.get)
    confidence = "media"
    if scores[best] > 0.9: confidence = "alta"
    if scores[best] < 0.5: confidence = "baja"

    return MitigationResponse(
        strategy=best,
        confidence=confidence,
        scores=scores,
        miss_nominal_km=payload.miss_km,
        miss_after_mitigation_km=round(miss_new/1000, 1),
        suggested={
            "dv_mps": dv_need,
            "direction": "tangential-prograde",
            "when": "lo antes posible",
            "n_impactors": n_imp if best=="kinetic" else None
        },
        why=why
    )
