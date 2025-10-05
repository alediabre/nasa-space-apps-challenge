import math
from dataclasses import dataclass
from typing import Optional, Dict, Any

# =======================
# Utilidades y constantes
# =======================
J_PER_MT = 4.184e15         # J en 1 megatón TNT
J_PER_KT = 4.184e12         # J en 1 kilotón TNT
KPA_PER_PSI = 6.89475729
R_EARTH = 6_371_000.0       # m
SIGMA = 5.670374419e-8      # W m^-2 K^-4 (constante de Stefan-Boltzmann)
T_STAR = 3000.0             # K (temperatura efectiva bola de fuego, simplif.)
GRAVITY = 9.80665           # m/s^2
RHO_TARGET = 2_500.0        # kg/m^3 densidad objetivo (suelo rocoso típico)
YIELD_STRENGTH = 3e6        # Pa (orden magnitud; para transiciones cráter simple/compuesto)

def joules_to_megatons(joules: float) -> float:
    return joules / J_PER_MT

def megatons_to_joules(megatons: float) -> float:
    return megatons * J_PER_MT

def joules_to_kilotons(joules: float) -> float:
    return joules / J_PER_KT

def psi_to_kpa(psi: float) -> float:
    return psi * KPA_PER_PSI

def kpa_to_psi(kpa: float) -> float:
    return kpa / KPA_PER_PSI

# =======================
# Escenarios y parámetros
# =======================
@dataclass
class Asteroid:
    diameter_m: float     # diametro del objeto
    velocity_mps: float   # m/s (cuidado porque NEO API da km/s a menudo, para el futuro)
    density_kgm3: float   # kg/m^3 
    shape_factor : float = 1.0  # si es 1(esfera perfecta), si <1 entonces otra forma 
    porosity: float = 0.0  # Factor recomendado para un mayor ajuste a las características del objeto

@dataclass
class Atmosphere:
    k_atenuacion: float = 0.1
    burst_altitude_m: Optional[float] = None  # m; si None y hay airburst, se puede estimar aparte
      


@dataclass
class Target:
    density_kgm3: float = RHO_TARGET
    water_depth_m: Optional[float] = None  # m (None si impacto terrestre)

@dataclass
class ImpactScenario:
    is_airburst: bool
    latitude_deg: Optional[float] = None
    longitude_deg: Optional[float] = None


# =======================
# Núcleo de métricas
# =======================
class ImpactMetrics:
    """
    Colección de métricas de impacto con fórmulas tipo Collins et al. (versión simplificada).
    Pensada para:
      - Airburst: sobrepresión y dosis térmica en función de distancia.
      - Ground impact: tamaño de cráter, Mw sísmica, isóbaras y térmico (si procede).
      - Tsunami (modelo muy simple; refinar luego).
    """

    # ---- Energía ----
    @staticmethod
    def kinetic_energy(asteroid: Asteroid) -> float:
        """
        Energia cinética (J).
        """
       # radio en metros
        r = asteroid.diameter_m / 2.0
        volume = (4.0 / 3.0) * math.pi * (r ** 3) * asteroid.shape_factor
        density_effective = asteroid.density_kgm3 * (1.0 - asteroid.porosity)
        mass = volume * density_effective
        return 0.5 * mass * (asteroid.velocity_mps ** 2)
    @staticmethod
    def kinetic_energy_megatons(asteroid:Asteroid)->float:
        E = ImpactMetrics.kinetic_energy(asteroid)
        return joules_to_megatons(E)

    # ---- Bola de fuego / térmico (airburst o superficie) ----
    @staticmethod
    def fireball_radius(E_joules: float) -> float:
        # Relación típica escala ~ E^(1/3); coef calibrable
        return 0.002 * (E_joules ** (1.0 / 3.0))

    @staticmethod
    def thermal_exposure_at_distance(E_joules: float, horizontal_distance_m:float, 
                                    atmosfera: Atmosphere, 
                                    eta: float = 3e-3) -> float:
        """
        Exposición térmica en función de la altura de la explosión y la 
        distancia horizontal dada. 
        Tendremos en cuenta un factor de atenuación y 
        la proporción de energía que se convierte en calor (eta)
        """

        if horizontal_distance_m <=0: 
            return float("inf") 
        h = atmosfera.burst_altitude_m or 0.0 
        if h == 0: # La explosión se producirá en el suelo consideramos media esfera
            denominador = 2.0 * math.pi * (horizontal_distance_m**2)
            #tau = 1.0 Otro factor de atenuación para el suelo 
            return eta * E_joules / denominador 
        
        # Aquí vamos a contemplar la explosión aérea, haciendole correcciones a la esfera
        distance = math.sqrt(horizontal_distance_m**2 + atmosfera.burst_altitude_m**2)
        if distance <= 0:
            return float('inf')
        
        cos_theta = h / distance # Esta es la proyección angular (ángulo de inclinación con el que llega la radiación)
        cos_theta = max(0.0,min(1.0, cos_theta))

        # Vamos a ponerle un factor geométrico, en lugar de coger semiesfera o esfera 
        # Lo hago porque muy cerca del suelo puedo considerar media esfera
        # Muy alto puedo considerarlo una esfera uniforme
        G = 0.5 + 0.5 * (h/(h + horizontal_distance_m))

        # Consideramos también la atenuación de la atmósfera
        # Lo que hago es considerar la masa del aire(simplificado), 
        # lo que hace que la radiación se diluya 

        air_mass = distance / (h + 1.0)
        tau = math.exp(-atmosfera.k_atenuacion * air_mass)
        
        # Vamos a incorporar la fracción visible por curvatura 

        Rf = ImpactMetrics.fireball_radius(E_joules) # Rf es radius fireball no paniqueen
        frec_visible = ImpactMetrics.horizon_fraction(horizontal_distance_m,Rf)

        denominador = 4.0 * math.pi * distance**2 

        return eta * E_joules * cos_theta * tau * G * frec_visible / denominador


    """
    La parte de horizon fraction también se puede considerar una capa de refinamiento,
    solo que teniendo en cuenta el horizonte. Es decir, considerando la curvatura de la 
    tierra y mi distancia a la explosión, cuanto puedo ver. 
    Me dará valores entre 0 y 1 que me dirán cuánto veo de la explosión y 
    luego se usa en corrected_exposure de forma que la exposición aumentará o
    disminuirá en función de esta. 
    
    """
    @staticmethod
    def horizon_fraction(r_m: float, Rf: float) -> float:
        """
        Corrección geométrica: por curvatura, cuánto "ve" el observador de la bola de fuego.
        """
        delta = r_m / R_EARTH
        h = (1.0 - math.cos(delta)) * R_EARTH
        if h >= Rf:
            return 0.0
        G = math.acos(max(-1.0, min(1.0, h / Rf)))
        f = (2.0 / math.pi) * (G - (h / Rf) * math.sin(G))
        return max(0.0, min(1.0, f))

    @staticmethod
    def corrected_exposure(E_joules: float, r_m: float, eta: float = 3e-3) -> float:
        Rf = ImpactMetrics.fireball_radius(E_joules)
        phi0 = ImpactMetrics.thermal_exposure_at_distance(E_joules, r_m, eta)
        f = ImpactMetrics.horizon_fraction(r_m, Rf)
        return f * phi0

    @staticmethod
    def thermal_duration_tau(E_joules: float, eta: float = 3e-3, T_star: float = T_STAR) -> float:
        """
        Duración característica del pulso térmico (s).
        tau_t = eta * E / (2*pi*Rf^2 * sigma * T_star^4)
        """
        Rf = ImpactMetrics.fireball_radius(E_joules)
        denom = 2.0 * math.pi * (Rf ** 2) * SIGMA * (T_star ** 4)
        return 0.0 if denom <= 0 else (eta * E_joules) / denom

    # ---- Sobrepresión (airburst) ----
    @staticmethod
    def overpressure_collins_airburst(E_joules: float, burst_altitude_m: float, r_m: float) -> float:
        """
        Sobrepresión (Pa) en el suelo a distancia r_m para una explosión aérea a altura h.
        Implementa pieza a pieza (regular vs Mach reflection) con escalado ~ E^(1/3).
        """
        E_kt = joules_to_kilotons(E_joules)
        scale = E_kt ** (1.0 / 3.0) if E_kt > 0 else 1.0
        r1 = r_m / scale
        h1 = burst_altitude_m / scale if burst_altitude_m > 0 else 1e-6

        # Región cercana (parámetros ajustables)
        p0 = 3.14e11 * (h1 ** -2.6)
        beta = 34.87 * (h1 ** -1.73)

        # Radio de transición a reflexión Mach
        denom = (550.0 - h1)
        rm1 = 1e12 if denom <= 0 else 550.0 * (h1 ** 1.2) / (1.2 * denom)

        if r1 <= rm1:
            p = p0 * math.exp(-beta * r1)
        else:
            # Lejana (Mach): forma funcional simplificada
            PX = 75_000.0    # Pa
            RX = 290.0       # m
            p = PX * (RX / (4.0 * r1)) * (1.0 + 3.0 * ((r1 / RX) ** 1.3))

        return max(0.0, p)

    @staticmethod
    def radius_for_overpressure_airburst(E_joules: float, burst_altitude_m: float,
                                         p_threshold_kpa: float,
                                         R_min: float = 10.0, R_max: float = 1_000_000.0,
                                         tol: float = 1.0, maxiter: int = 100) -> Optional[float]:
        """
        Búsqueda binaria de radio (m) donde la sobrepresión ≈ p_threshold_kpa.
        Devuelve None si no se alcanza.
        """
        target_Pa = p_threshold_kpa * 1_000.0
        f = lambda R: ImpactMetrics.overpressure_collins_airburst(E_joules, burst_altitude_m, R) - target_Pa

        if f(R_min) < 0:
            return None

        lo, hi = R_min, R_max
        for _ in range(maxiter):
            mid = 0.5 * (lo + hi)
            val = f(mid)
            if abs(hi - lo) <= tol:
                return mid
            if val > 0:
                lo = mid
            else:
                hi = mid
        return 0.5 * (lo + hi)

    # ---- Cráter (impacto en suelo) ----
    @staticmethod
    def crater_diameter_simple(E_joules: float, target: Target) -> float:
        """
        Diámetro de cráter final (m), escala práctica pi-group (muy simplificada).
        Útil para orden de magnitud. Calibrable con casos reales.
        """
        # Escalado típico: D ~ k * (g^-0.17) * (rho_i / rho_t)^0.11 * (E^0.29)
        # Coeficiente k pragmático para quedar en el rango de Barringer/Tunguska.
        k = 1.8e-3
        rho_i_over_rho_t = 3000.0 / max(target.density_kgm3, 1.0)
        D = k * (GRAVITY ** -0.17) * (rho_i_over_rho_t ** 0.11) * (E_joules ** 0.29)
        return max(0.0, D)

    # ---- Magnitud sísmica (Mw) ----
    @staticmethod
    def seismic_magnitude_Mw(E_joules: float, coupling: float = 1e-4) -> float:
        """
        Estima Mw a partir de energía sísmica acoplada.
        coupling ~ 1e-4 .. 1e-3 (fracción de E que va a ondas sísmicas).
        Usamos relación empírica: log10(E_s[J]) ≈ 1.5*Mw + 4.8  (análoga a energía sísmica)
        """
        E_s = max(1.0, coupling * E_joules)
        Mw = (math.log10(E_s) - 4.8) / 1.5
        return Mw

    # ---- Tsunami (muy simplificado) ----
    @staticmethod
    def tsunami_wave_height_coast(E_joules: float, depth_m: float, range_km: float = 100.0) -> float:
        """
        Altura de ola en costa (m) por impacto oceánico muy simplificada.
        Da una cota para visualizar; refínalo con batimetría y propagación si da tiempo.
        """
        if depth_m <= 0:
            return 0.0
        # Conversión energía a "dislocación" efectiva, con amortiguamiento ~ distancia.
        # h ~ c * (E^(1/4)) / (depth^(1/2) * range_km^(3/4)) ; coef calibrable
        c = 0.012
        h = c * (E_joules ** 0.25) / (max(depth_m, 1.0) ** 0.5 * max(range_km, 1.0) ** 0.75)
        return max(0.0, h)

    # ---- Umbrales de daño por sobrepresión (para isóbaras) ----
    @staticmethod
    def damage_thresholds_kpa() -> Dict[str, float]:
        return {
            "window_break_light": psi_to_kpa(1.0),   # ~1 psi
            "window_break_moderate": psi_to_kpa(3.0),# ~3 psi
            "tree_blowdown": psi_to_kpa(5.0),        # ~5 psi
            "structural_damage": psi_to_kpa(10.0)    # ~10 psi (orientativo)
        }

    # ---- “Runner” principal para un escenario ----
    @staticmethod
    def summarize(asteroid: Asteroid, scenario: ImpactScenario, target: Target, atm: Atmosphere) -> Dict[str, Any]:
        E = ImpactMetrics.kinetic_energy(asteroid)
        W_mt = joules_to_megatons(E)

        out = {
            "inputs": {
                "diameter_m": asteroid.diameter_m,
                "velocity_mps": asteroid.velocity_mps,
                "density_kgm3": asteroid.density_kgm3,
                "is_airburst": scenario.is_airburst,
                "burst_altitude_m": atm.burst_altitude_m,
                "target_density_kgm3": target.density_kgm3,
                "water_depth_m": target.water_depth_m,
            },
            "energy": {
                "E_joules": E,
                "yield_megatons": W_mt,
                "yield_kilotons": joules_to_kilotons(E)
            },
        }

        # Térmico genérico (distancia de ejemplo; la UI usará perfiles radiales)
        sample_r_km = [1, 5, 10, 20, 50, 100]
        thermal = []
        for rk in sample_r_km:
            r_m = rk * 1000.0
            phi = ImpactMetrics.corrected_exposure(E, r_m)
            tau = ImpactMetrics.thermal_duration_tau(E)
            thermal.append({"r_km": rk, "fluence_Jm2": phi, "duration_s": tau})
        out["thermal_profile"] = thermal

        if scenario.is_airburst and atm.burst_altitude_m:
            # Isóbaras para 1/3/5 psi
            thresholds = ImpactMetrics.damage_thresholds_kpa()
            isobars = {}
            for key, kpa in thresholds.items():
                R = ImpactMetrics.radius_for_overpressure_airburst(E, atm.burst_altitude_m, kpa)
                isobars[key] = None if R is None else R / 1000.0
            out["overpressure_isobars_km"] = isobars

        else:
            # Impacto en suelo: cráter + Mw
            D = ImpactMetrics.crater_diameter_simple(E, target)
            Mw = ImpactMetrics.seismic_magnitude_Mw(E)
            out["crater"] = {"final_diameter_m": D}
            out["seismic"] = {"Mw": Mw}

            # Tsunami si agua
            if target.water_depth_m and target.water_depth_m > 0:
                h_coast = ImpactMetrics.tsunami_wave_height_coast(E, target.water_depth_m, range_km=100.0)
                out["tsunami"] = {"H_100km_m": h_coast}

        return out
