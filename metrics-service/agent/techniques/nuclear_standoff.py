import math
from models.mitigation_models import MitigationResult

from services.mitigation_metrics import MitigationMetrics

def nuclear_strategy(metrics: MitigationMetrics, payload) -> MitigationResult:
    """
    Nuclear strategy (standoff explosion).
    Calculates the Δv imparted based on bomb yield and
    energy coupling efficiency.
    """

    # --- Parameters ---
    yield_kt = getattr(payload, "nuclearYield_kt", 1000)  # yield in kilotons TNT
    f_c = getattr(payload, "couplingEff", 1e-4)          # coupling efficiency

    # --- Δv required for the target ---
    dv_need = metrics.dv_needed(payload.targetMiss_km)

    # --- Asteroid mass ---
    M_ast = metrics.asteroid_mass()

    # --- Total explosion energy (1 kt = 4.184e12 J) ---
    E = yield_kt * 4.184e12
    # --- Energy coupled to the asteroid ---
    E_c = f_c * E

    # --- Δv imparted (approx simplified) ---
    dv = math.sqrt(2 * E_c / M_ast)
    
    # --- New miss distance ---
    miss_new = metrics.miss_distance_after_dv(payload.miss_km, dv)

    # raw ratio
    ratio = dv / dv_need if dv_need > 0 else 0.0
    score_value = ratio / (1 + ratio)

    # adjustments
    if payload.D_m < 300:
        score_value *= 0.4  # too small → nuclear unnecessary
    if payload.leadYears > 10:
        score_value *= 0.6  # with enough time, better techniques exist
    if ratio > 10:
        score_value *= 0.5  # overkill → penalize

    # normalize
    score_value = min(score_value, 1.0)

    # --- Confidence ---
    if score_value > 0.8:
        confidence = "high"
    elif score_value > 0.5:
        confidence = "medium"
    else:
        confidence = "low"

    # --- Explanation ---
    explanation = (
        f"Required Δv: {dv_need:.6f} m/s\n"
        f"Yield: {yield_kt} kt → Total energy = {E:.3e} J\n"
        f"Coupling efficiency: {f_c:.1e}\n"
        f"E_c = {E_c:.3e} J\n"
        f"Δv imparted: {dv:.6f} m/s\n"
        f"Coverage ratio: {ratio:.2f}\n"
        f"Miss distance after mitigation: {miss_new/1000:.1f} km"
    )

    return MitigationResult(
        technique="nuclear",
        delta_v_ms=dv,
        displacement_km=miss_new/1000,
        scores={"nuclear": score_value},
        confidence=confidence,
        suggested={
            "dv_mps": dv,
            "direction": "radial (standoff detonation)",
            "when": "as soon as possible",
            "yield_kt": yield_kt,
            "coupling_eff": f_c
        },
        why=[
            "Nuclear technique can impart large Δv in short time.",
            "Suitable for large asteroids or when lead time is short."
        ],
        explanation=explanation
    )