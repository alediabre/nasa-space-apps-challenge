from langchain.tools import tool
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from services.impact_metrics import ImpactMetrics, Asteroid, Atmosphere, Target, ImpactScenario
from models.impact_models import ImpactResponse 
from langchain.tools import tool
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from services.impact_metrics import ImpactMetrics, Asteroid, Atmosphere, Target, ImpactScenario

# --- MODELO DE RESPUESTA ---
class ImpactResponse(BaseModel):
    energy_megatons: float
    fireball_radius_m: float
    thermal_profile: List[Dict[str, float]]
    overpressure_isobars_km: Optional[Dict[str, float]] = None
    crater_diameter_m: Optional[float] = None
    seismic_Mw: Optional[float] = None
    tsunami_wave_height_m: Optional[float] = None
    summary: str


# --- TOOLKIT ---
class EffectsToolkit:
    def __init__(self, asteroid: dict, scenario: dict, target: dict, atmosphere: dict):
        self.asteroid = Asteroid(**asteroid)
        self.scenario = ImpactScenario(**scenario)
        self.target = Target(**target)
        self.atmosphere = Atmosphere(**atmosphere)

    def evaluate(self) -> ImpactResponse:
        """Ejecuta todos los cálculos físicos relevantes del impacto."""
        E_joules = ImpactMetrics.kinetic_energy(self.asteroid)
        E_mt = ImpactMetrics.kinetic_energy_megatons(self.asteroid)
        Rf = ImpactMetrics.fireball_radius(E_joules)

        # --- Perfil térmico radial (1–100 km) ---
        thermal_profile = []
        for r_km in [1, 5, 10, 20, 50, 100]:
            phi = ImpactMetrics.corrected_exposure(E_joules, r_km * 1000)
            tau = ImpactMetrics.thermal_duration_tau(E_joules)
            thermal_profile.append({
                "r_km": r_km,
                "fluence_Jm2": phi,
                "duration_s": tau
            })

        # --- Isóbaras o cráter según tipo de impacto ---
        overpressure_isobars = None
        crater_diameter_m = None
        seismic_Mw = None
        tsunami_wave_height_m = None

        if self.scenario.is_airburst and self.atmosphere.burst_altitude_m:
            thresholds = ImpactMetrics.damage_thresholds_kpa()
            overpressure_isobars = {}
            for key, kpa in thresholds.items():
                R = ImpactMetrics.radius_for_overpressure_airburst(E_joules, self.atmosphere.burst_altitude_m, kpa)
                overpressure_isobars[key] = None if R is None else R / 1000.0
        else:
            crater_diameter_m = ImpactMetrics.crater_diameter_simple(E_joules, self.target)
            seismic_Mw = ImpactMetrics.seismic_magnitude_Mw(E_joules)
            if self.target.water_depth_m and self.target.water_depth_m > 0:
                tsunami_wave_height_m = ImpactMetrics.tsunami_wave_height_coast(E_joules, self.target.water_depth_m)

        # --- Resumen textual (para el agente) ---
        summary = (
            f"Energía total: {E_mt:.2f} Mt TNT\n"
            f"Radio bola de fuego: {Rf/1000:.1f} km\n"
            f"Tipo: {'Airburst' if self.scenario.is_airburst else 'Impacto superficial'}\n"
        )
        if crater_diameter_m:
            summary += f"Diámetro cráter: {crater_diameter_m/1000:.2f} km\n"
        if seismic_Mw:
            summary += f"Magnitud sísmica: Mw {seismic_Mw:.2f}\n"
        if tsunami_wave_height_m:
            summary += f"Altura ola costa: {tsunami_wave_height_m:.2f} m\n"

        return ImpactResponse(
            energy_megatons=E_mt,
            fireball_radius_m=Rf,
            thermal_profile=thermal_profile,
            overpressure_isobars_km=overpressure_isobars,
            crater_diameter_m=crater_diameter_m,
            seismic_Mw=seismic_Mw,
            tsunami_wave_height_m=tsunami_wave_height_m,
            summary=summary
        )


# --- TOOL USABLE POR EL AGENTE ---
@tool("effects_toolkit", return_direct=True)
def effects_toolkit_tool(
    asteroid: Optional[dict] = None,
    scenario: Optional[dict] = None,
    target: Optional[dict] = None,
    atmosphere: Optional[dict] = None,
    params: Optional[dict] = None
) -> dict:
    """
    Tool principal que calcula los efectos físicos del impacto de un asteroide.

    Acepta tanto un único diccionario 'params' (como lo usa LangChain)
    como los cuatro argumentos explícitos (asteroid, scenario, target, atmosphere).
    """

    # 🔹 Desempaquetar si viene en params
    if params and isinstance(params, dict):
        asteroid = asteroid or params.get("asteroid")
        scenario = scenario or params.get("scenario")
        target = target or params.get("target")
        atmosphere = atmosphere or params.get("atmosphere")

    # 🔹 Validación y fallback
    def ensure_dict(name, value, defaults=None):
        if not isinstance(value, dict):
            print(f"[WARN] '{name}' no es dict. Valor recibido: {value}")
            return defaults or {}
        return value

    asteroid = ensure_dict("asteroid", asteroid)
    scenario = ensure_dict("scenario", scenario)
    target = ensure_dict("target", target)
    atmosphere = ensure_dict("atmosphere", atmosphere, defaults={"k_atenuacion": 1.0, "burst_altitude_m": 0.0})

    # 🔹 Validar claves mínimas requeridas
    required = {"asteroid": asteroid, "scenario": scenario, "target": target, "atmosphere": atmosphere}
    missing = [k for k, v in required.items() if not isinstance(v, dict) or not v]
    if missing:
        return {"error": f"Missing or invalid keys: {missing}"}

    try:
        tk = EffectsToolkit(
            asteroid=asteroid,
            scenario=scenario,
            target=target,
            atmosphere=atmosphere
        )
        result = tk.evaluate()
        return result.dict()

    except Exception as e:
        return {"error": f"Error interno en EffectsToolkit: {str(e)}"}




