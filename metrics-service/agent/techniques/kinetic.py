import math 
from services.mitigation_metrics import MitigationMetrics 
from models.mitigation_models import MitigationResult


def kinetic_strategy(metrics: MitigationMetrics, payload): 

    # dv required to achieve target miss_distance 
    dv_need = metrics.dv_needed(payload.targetMiss_km) 

    # dv achieved per impactor 
    dv_imp = metrics.dv_per_impactor(payload.mImp_kg, payload.beta)

    # number of impactors 
    n_imp = max(1, math.ceil(dv_need / dv_imp)) 

    # Distance after applying dv 
    miss_new = metrics.miss_distance_after_dv(payload.miss_km, dv_need)

    # Score adjustment based on efficiency ratio
    # impactor distance / required distance
    # Also apply penalties depending on lead years
    # Finally, confidence is added based on the score


    # Efficiency ratio
    ratio = (dv_imp * n_imp) / dv_need if dv_need > 0 else 0.0
    score_value = min(ratio, 1.0)  # limited to 1.0 (optimal)

    # Additional adjustments
    if payload.leadYears < 3:
        score_value *= 0.3   # short lead time → kinetic less viable
    if payload.D_m > 500:
        score_value *= 0.5   # very large → penalized
    if 100 <= payload.D_m <= 500 and 3 <= payload.leadYears <= 10:
        score_value *= 1.2
        

    # Confidence based on score
    if score_value > 0.8:
        confidence = "high"
    elif score_value > 0.5:
        confidence = "medium"
    else:
        confidence = "low"

    # Detailed explanation
    explanation = (
        f"Required Δv: {dv_need:.6f} m/s\n"
        f"Δv per impactor: {dv_imp:.6f} m/s\n"
        f"Number of impactors: {n_imp}\n"
        f"Coverage ratio: {ratio:.2f}\n"
        f"Final score: {score_value:.2f}\n"
        f"Miss distance after mitigation: {miss_new/1000:.1f} km"
    )


    return MitigationResult(
        technique="kinetic",
        delta_v_ms=dv_imp * n_imp,
        displacement_km=miss_new / 1000,
        n_impactors=n_imp,
        scores={"kinetic": score_value},
        confidence=confidence,
        suggested={
            "dv_mps": dv_need,
            "direction": "tangential-prograde",
            "when": "as soon as possible",
            "n_impactors": n_imp
        },
        why=[
            "Adequate lead time for kinetic impact." if payload.leadYears >= 3 else "Low lead time → kinetic penalized.",
            "Capability to deflect with available impactors." if score_value > 0.5 else "Probably insufficient."
        ],
        explanation=explanation
    )
