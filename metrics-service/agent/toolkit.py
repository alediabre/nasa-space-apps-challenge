from services.mitigation_metrics import MitigationMetrics
from models.mitigation_models import MitigationResponse
from agent.techniques.kinetic import kinetic_strategy
from agent.techniques.tractor import tractor_strategy
from agent.techniques.nuclear_standoff import nuclear_strategy
from agent.techniques.civil import civil_strategy
class MitigationToolkit:
    def __init__(self, payload):
        self.payload = payload
        self.metrics = MitigationMetrics(
            D_m=payload.D_m,
            rho=payload.rho,
            lead_years=payload.leadYears,
            vRel_kms=payload.vRel_kms,
            yield_kt=getattr(payload, "nuclearYield_kt", 1000)  # opcional
        )

    def evaluate(self) -> MitigationResponse:
        """
        Ejecuta todas las estrategias, calcula sus scores y devuelve
        la mejor en forma de MitigationResponse.
        """

        # Ejecutamos cada estrategia
        results = [
            kinetic_strategy(self.metrics, self.payload),
            tractor_strategy(self.metrics, self.payload),
            nuclear_strategy(self.metrics, self.payload),
            civil_strategy(self.metrics, self.payload),
        ]

        # Construimos diccionario de scores
        scores = {res.technique: list(res.scores.values())[0] if res.scores else 0.0 for res in results}

        # Elegimos la mejor según el score más alto
        best = max(results,
    key=lambda r: list(r.scores.values())[0] if r.scores else 0.0)

        # Confianza viene de la estrategia elegida
        confidence = best.confidence

        # --- Construcción del MitigationResponse ---
        return MitigationResponse(
            strategy=best.technique,
            confidence=confidence,
            scores=scores,
            miss_nominal_km=self.payload.miss_km,
            miss_after_mitigation_km=(
                round(best.displacement_km, 1) if best.displacement_km else None
            ),
            suggested=best.suggested,
            why=best.why  # se puede enriquecer luego por el agente
        )