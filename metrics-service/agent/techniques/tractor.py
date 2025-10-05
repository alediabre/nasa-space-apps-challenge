import math 
from services.mitigation_metrics import MitigationMetrics 
from models.mitigation_models import MitigationResult
from services.mitigation_metrics import MitigationMetrics

def tractor_strategy(metrics: MitigationMetrics, payload) -> MitigationResult:
    # Δv required for the target
    dv_need = metrics.dv_needed(payload.targetMiss_km)

    # Δv that the gravity tractor can provide
    dv_year, dv_tot = metrics.dv_tractor(
        mSc_kg=payload.tractorMass_kg,
        r_op_m=payload.tractorRange_m
    )

    # Distance after applying the total Δv
    miss_new = metrics.miss_distance_after_dv(payload.miss_km, dv_tot)

    # Efficiency ratio
    ratio = dv_tot / dv_need if dv_need > 0 else 0.0
    score_value = min(ratio, 1.0)

    # Additional adjustments
    if payload.leadYears < 10:
        score_value *= 0.4   # short lead time → tractor less effective
    if payload.D_m > 500:
        score_value *= 0.7   # very large asteroid → penalized
    if payload.binary:
        score_value *= 0.8   # binary system → more complicated

    if payload.leadYears > 20:
        score_value *= 1.2


    # Confidence based on the score
    if score_value > 0.8:
        confidence = "high"
    elif score_value > 0.5:
        confidence = "medium"
    else:
        confidence = "low"

    # Detailed explanation
    explanation = (
        f"Required Δv: {dv_need:.6f} m/s\n"
        f"Δv per year with tractor: {dv_year:.6e} m/s\n"
        f"Total tractor Δv: {dv_tot:.6e} m/s\n"
        f"Coverage ratio: {ratio:.2f}\n"
        f"Final score: {score_value:.2f}\n"
        f"Miss distance after mitigation: {miss_new/1000:.1f} km"
    )

    return MitigationResult(
        technique="tractor",
        delta_v_ms=dv_tot,
        displacement_km=miss_new/1000,
        scores={"tractor": score_value},
        confidence=confidence,
        suggested={
            "dv_mps": dv_tot,
            "direction": "station-keeping",
            "when": "maintain constant thrust",
        },
        why=[
            "Gravity tractor useful in long-term scenarios.",
            "Limited by spacecraft mass and operating distance."
        ],
        explanation=explanation
    )
