# services/horizons_service.py
import re, math, httpx
from datetime import datetime, timezone
import asyncio

HZ = "https://ssd.jpl.nasa.gov/api/horizons.api"
_semaphore = asyncio.Semaphore(2)   # límite: 1 request concurrente

async def get_orbit_elements(command: str, center: str):
    # Pedimos EXACTAMENTE un instante con TLIST (UTC)
    now_utc_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    params = {
        "format": "json",
        "EPHEM_TYPE": "ELEMENTS",
        "MAKE_EPHEM": "YES",
        "COMMAND": f"'{command}'",
        "CENTER":  f"'{center}'",
        "REF_PLANE": "ECLIPTIC",
        "REF_SYSTEM": "J2000",
        "OUT_UNITS": "AU-D",
        "ANG_FORMAT": "DEG",
        "CSV_FORMAT": "YES",
        "ELEM_LABELS": "YES",   # si Horizons lo respeta, tendremos cabeceras
        "TLIST": f"'{now_utc_str}'",
        "OBJ_DATA": "NO",
    }
    async with _semaphore:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(HZ, params=params)
            r.raise_for_status()
            data = r.json()
            if "result" not in data:
                raise ValueError(f"Horizons: respuesta inesperada {data}")
            #print(data['result'])
            parsed = parse_elements(data["result"])
            return parsed


def parse_elements(data):
    data_labels = [
        "JDTDB",            # Julian Day (TDB)
        "CalendarDate",     # Calendar Date (TDB)
        "EC",               # Eccentricity (e)
        "QR",               # Periapsis distance (q, AU)
        "IN",               # Inclination (deg)
        "OM",               # Longitude of Ascending Node (Ω, deg)
        "W",                # Argument of Periapsis (ω, deg)
        "Tp",               # Time of periapsis (JDTDB)
        "N",                # Mean motion (deg/day)
        "MA",               # Mean anomaly (deg)
        "TA",               # True anomaly (deg)
        "A",                # Semi-major axis (AU)
        "AD",               # Apoapsis distance (Q, AU)
        "PR"                # Orbital period (days)
    ]

    data_values = data.split('$$SOE')[1].split('$$EOE')[0].split(',')
    data_dicc = {a : b for a, b in zip(data_labels, data_values)}

    keys = ['A','EC','IN','OM','W','MA','PR','N','JDTDB']
    sub_dicc = {k: data_dicc[k] for k in keys if k in data_dicc}

    # Convertir a radianes los que son ángulos
    for k in ['IN', 'OM', 'W', 'MA', 'N']:
        if k in sub_dicc:
            sub_dicc[k] = math.radians(float(sub_dicc[k]))
    
    return normalize_numeric_dict(sub_dicc)

def normalize_numeric_dict(data_dicc: dict) -> dict:
    clean = {}
    for k, v in data_dicc.items():
        if not isinstance(v, str):
            clean[k] = v
            continue
        val = v.strip()
        try:
            num = float(val)
            # Formato decimal sin notación científica
            # Ajusta el número de decimales según lo que necesites
            clean[k] = f"{num:.12f}".rstrip("0").rstrip(".")
        except ValueError:
            # No es número → dejar como string limpio
            clean[k] = val
    return clean
