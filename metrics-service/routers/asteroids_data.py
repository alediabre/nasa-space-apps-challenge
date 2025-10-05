from fastapi import APIRouter
from typing import List, Optional
from pydantic import BaseModel
import os, asyncio
from typing import Optional, List, Dict, Any
from fastapi import  APIRouter, HTTPException, Query
from pydantic import BaseModel
import httpx
import json
from datetime import datetime, timezone
import math

router = APIRouter(
    prefix="/asteroids",
    tags=["asteroids"]
)


# --- Models ---

class OrbitElts(BaseModel):
    # Elementos orbitales heliocéntricos (eclíptica J2000), en unidades de catálogo
    asteroid_name: str
    a: float                   # semieje mayor (UA)
    e: float                   # excentricidad
    periodDays : float
    i: float                   # inclinación (deg)
    om: float                  # Ω longitud nodo ascendente (deg)
    w: float                   # ω argumento de perihelio (deg)
    ma: float                  # M0 anom. media en época (deg)
    epoch_jd: float

SBDB_LOOKUP = "https://ssd-api.jpl.nasa.gov/sbdb.api"
NASA_API_KEY = os.getenv('VITE_NASA_API_KEY')

@router.get("/elements", response_model=OrbitElts)
async def get_elements(sstr: str):
    """
    sstr puede ser nombre ('Apophis'), designación ('99942') o SPK-ID.
    """
    params = {
        "sstr": sstr,
        "full-prec": "true",   # más precisión
    }
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(SBDB_LOOKUP, params=params)
    j = r.json()
    #print(type(j))
    #print(j)
    #print(print(json.dumps(j, indent=2)))

    asteroid_name = j['object']['fullname']
    orbit_elements = j['orbit']['elements']

    a = float(next((d['value'] for d in orbit_elements if d.get('label') == 'a'), None))
    e = float(next((d['value'] for d in orbit_elements if d.get('label') == 'e'), None))

    # Ángulos en grados → convertir a radianes
    i = math.radians(float(next((d['value'] for d in orbit_elements if d.get('label') == 'i'), None)))
    om = math.radians(float(next((d['value'] for d in orbit_elements if d.get('label') == 'node'), None)))
    w = math.radians(float(next((d['value'] for d in orbit_elements if d.get('label') == 'peri'), None)))
    M0 = math.radians(float(next((d['value'] for d in orbit_elements if d.get('label') == 'M'), None)))

    period = float(next((d['value'] for d in orbit_elements if d.get('label') == 'period'), None))
    epoch_jd = float(j['orbit']['epoch']) 

    #n = float(next((d['value'] for d in orbit_elements if d.get('label') == 'n'), None))
    
    #M0_deg = float(next((d['value'] for d in orbit_elements if d.get('label') == 'M'), None))
    

    #ma_deg = float(next((d['value'] for d in orbit_elements if d.get('label') == 'M'), None))
    #jd_now = datetime_to_jd(datetime.now(timezone.utc))
    #jd_now_tt  = jd_now + 69.184/86400.0
    #M_now = (ma_deg + n * (jd_now_tt - epoch_jd)) % 360.0
    #M_now = ma_deg + n * (jd_now - epoch_jd)


    return OrbitElts(
        asteroid_name = asteroid_name,
        a   = a,
        e   = e,
        periodDays=period,
        i   = i,
        om  = om,
        w   = w,
        ma  = M0,
        epoch_jd = epoch_jd,)

def datetime_to_jd(dt: datetime) -> float:
    """
    Convierte un datetime UTC a Día Juliano (JD).
    """
    # Asegúrate de que dt está en UTC
    dt = dt.astimezone(timezone.utc)

    Y = dt.year
    M = dt.month
    D = dt.day + (dt.hour + (dt.minute + dt.second/60)/60)/24

    if M <= 2:
        Y -= 1
        M += 12

    A = math.floor(Y/100)
    B = 2 - A + math.floor(A/4)

    jd = math.floor(365.25*(Y + 4716)) \
         + math.floor(30.6001*(M + 1)) \
         + D + B - 1524.5
    return jd