from models.mitigation_models import MitigationResult


def civil_strategy(metrics, payload) -> MitigationResult:
    """
    Civil protection strategy.
    Recommended for small asteroids that do not require deflection
    because they fragment in Earth's atmosphere.
    """

    # Simplified threshold: <70 m → civil protection
    if payload.D_m < 70:
        score_value = 1.0
        confidence = "high"
        why = ["Asteroid <70 m: it will fragment in the atmosphere, deflection not necessary."]
    else:
        score_value = 0.0
        confidence = "low"
        why = ["Asteroid too large to rely on atmospheric fragmentation."]

    explanation = (
        f"Asteroid diameter: {payload.D_m} m\n"
        f"Civil protection suitable only if D < 70 m.\n"
        f"Score: {score_value:.2f}"
    )

    return MitigationResult(
        technique="civil",
        delta_v_ms=0.0,
        displacement_km=None,
        scores={"civil": score_value},
        confidence=confidence,
        suggested={
            "action": "civil protection coordination",
            "when": "before impact"
        },
        why=why,
        explanation=explanation
    )
