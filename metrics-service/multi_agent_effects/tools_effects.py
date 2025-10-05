from langchain.agents import initialize_agent, AgentType
from langchain.tools import tool 
from typing import Literal
from langgraph.types import Command
from langchain_core.messages import HumanMessage
from langgraph.prebuilt import create_react_agent
import os
from dotenv import load_dotenv
from services.impact_metrics import ImpactMetrics
from services.impact_metrics import Asteroid,Atmosphere,Target,ImpactScenario
from services.population_service import estimate_population



load_dotenv()


API_LANGCHAIN = os.getenv("API_KEY_LANGSMITH")

#### TOOLS ####### 

os.environ["LANGCHAIN_TRACING_V2"] = "true"
#os.environ["LANGCHAIN_PROJECT"] = "Hierarchical Agent" 

###### Kinetic Energ ##############
@tool("kinetic_energy",return_direct=True) 
def kinetic_energy_tool(params:dict) -> dict:   
    """
    Calcula la energía cinética de un asteroide.
    Params esperados:
      {
        "diameter_m": float,
        "velocity_mps": float,
        "density_kgm3": float
      }
    """
    asteroid = Asteroid(
        diameter_m=params["diameter_m"],
        velocity_mps=params["velocity_mps"],
        density_kgm3=params["density_kgm3"],
    )
    E_joules = ImpactMetrics.kinetic_energy(asteroid)
    return {
        "E_joules": E_joules,
        "E_megatons": ImpactMetrics.kinetic_energy_megatons(asteroid)
    }


@tool("kinetic_energy_megatons")
def kinetic_energy_megatons_tool(asteroid: dict) -> float:
    """Calcula la energía del impacto en megatones de TNT."""
    a = Asteroid(**asteroid)
    return ImpactMetrics.kinetic_energy_megatons(a)

####### Tool: Crater Diameter ########

@tool("crater_diameter", return_direct=True)
def crater_diameter_tool(params: dict) -> dict:
    """
    Estima el diámetro del cráter de impacto en metros.
    Params esperados:
      {
        "E_joules": float,
        "target_density_kgm3": float
      }
    """
    target = Target(density_kgm3=params.get("target_density_kgm3", 2500))
    D = ImpactMetrics.crater_diameter_simple(params["E_joules"], target)
    return {"crater_diameter_m": D}

######## Tool: Overpressure (Airbust) #######

@tool("overpressure", return_direct=True)
def overpressure_tool(params: dict) -> dict:
    """
    Calcula la sobrepresión (Pa) en el suelo tras un airburst.
    Params esperados:
      {
        "E_joules": float,
        "burst_altitude_m": float,
        "distance_m": float
      }
    """
    P = ImpactMetrics.overpressure_collins_airburst(
        params["E_joules"],
        params["burst_altitude_m"],
        params["distance_m"]
    )
    return {"overpressure_Pa": P}


@tool("overpressure_isobars")
def overpressure_isobars_tool(params: dict) -> dict:
    """
    Calcula radios (km) para distintos umbrales de daño por sobrepresión.
    params: {E_joules, burst_altitude_m}
    """
    thresholds = ImpactMetrics.damage_thresholds_kpa()
    isobars = {}
    for key, kpa in thresholds.items():
        R = ImpactMetrics.radius_for_overpressure_airburst(
            params["E_joules"], params["burst_altitude_m"], kpa
        )
        isobars[key] = None if R is None else R / 1000.0
    return isobars

######## THERMAL ##########

@tool("thermal_duration", return_direct=True)
def thermal_duration_tool(params: dict) -> dict:
    """
    Calcula la duración de la radiación térmica (en segundos).
    Parámetros esperados:
      {
        "E_joules": float,
        "eta": float (opcional),
        "T_star": float (opcional)
      }
    """
    # Soporte flexible de argumentos
    E = params["E_joules"]
    eta = params.get("eta")
    T_star = params.get("T_star")

    if eta is not None and T_star is not None:
        tau = ImpactMetrics.thermal_duration_tau(E, eta, T_star)
    else:
        tau = ImpactMetrics.thermal_duration_tau(E)

    return {"thermal_duration_s": tau}



@tool("thermal_exposure")
def thermal_exposure_tool(params: dict) -> float:
    """
    Calcula la exposición térmica (J/m^2) en función de:
      - E_joules
      - horizontal_distance_m
      - atmosfera: {k_atenuacion, burst_altitude_m}
      - eta (opcional, default 3e-3)
    """
    atm = Atmosphere(**params["atmosfera"])
    return ImpactMetrics.thermal_exposure_at_distance(
        params["E_joules"], params["horizontal_distance_m"], atm, params.get("eta", 3e-3)
    )



@tool("fireball_radius", return_direct=True)
def fireball_radius_tool(params: dict) -> dict:
    """
    Radio estimado de la bola de fuego (m).
    Params:
      - E_joules: float
    """
    Rf = ImpactMetrics.fireball_radius(params["E_joules"])
    return {"fireball_radius_m": Rf, "fireball_radius_km": Rf / 1000.0}


###### TSUNAMI #####

@tool("tsunami_wave_height")
def tsunami_wave_height_tool(params: dict) -> float:
    """
    Estima la altura de ola en costa (m) por impacto oceánico.
    params: {E_joules, depth_m, range_km?}
    """
    return ImpactMetrics.tsunami_wave_height_coast(
        params["E_joules"], params["depth_m"], params.get("range_km", 100.0)
    )



@tool("estimate_population")
def estimate_population_tool(lat: float, lon: float, radius_m: float) -> int:
    """
    Estima la población dentro de un círculo definido por latitud, longitud y radio en metros.
    Usa capas raster de densidad poblacional (GHS POP 2025).
    Devuelve un número entero aproximado de personas.
    """
    # La función interna espera (lon, lat, radius_m), así que se corrige aquí
    return estimate_population(lon, lat, radius_m)




import requests

@tool("map_context_tool")
def map_context_tool(lat: float, lon: float, radius_km: float = 100.0) -> dict:
    """
    Devuelve información geográfica del área alrededor de un punto (lat, lon) usando OpenStreetMap.
    Incluye poblaciones, vías principales, cuerpos de agua y áreas naturales.

    Args:
        lat (float): Latitud del punto central.
        lon (float): Longitud del punto central.
        radius_km (float): Radio de búsqueda en kilómetros.

    Returns:
        dict: Lugares y elementos naturales dentro del radio.
    """
    overpass_url = "https://overpass-api.de/api/interpreter"
    radius_m = radius_km * 1000

    query = f"""
    [out:json][timeout:60];
    (
      node["place"](around:{radius_m},{lat},{lon});
      node["natural"](around:{radius_m},{lat},{lon});
      node["water"](around:{radius_m},{lat},{lon});
      way["highway"](around:{radius_m},{lat},{lon});
    );
    out center 50;
    """

    r = requests.get(overpass_url, params={"data": query}, timeout=90)
    r.raise_for_status()
    data = r.json()

    places = []
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name")
        category = next(iter(tags.keys()), "unknown")
        if name:
            places.append({"name": name, "type": category})

    return {
        "center": {"lat": lat, "lon": lon},
        "radius_km": radius_km,
        "n_results": len(places),
        "places": places[:20]
    }

