# pleiades-protocol-main/metrics-service/main.py

import sys
import os

# --- SOLUCIÓN DEFINITIVA ---
# Añade el directorio raíz del proyecto (/app dentro de Docker) a la ruta de Python
# para asegurar que todos los módulos como 'models' y 'routers' sean encontrados.
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from routers import population, impacts, horinzons_data, asteroids_data, mitigation
from services.validation import get_api_key

app = FastAPI(title="Asteroids Metrics Service",
              version="1.0.0",
              description="Service to provide various metrics for asteroid impact scenarios.",
              # Temporarily disable API key requirement for development
              # dependencies=[Depends(get_api_key)],
              contact={
                "name": "Pleiades Protocol Team"
                }
              )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(population.router)
app.include_router(impacts.router)
app.include_router(horinzons_data.router)
app.include_router(asteroids_data.router)
app.include_router(mitigation.router)


@app.get("/", tags=["helper"], response_model=dict[str, str],
         summary="List all endpoints")
async def root():
    tags = {}
    for route in app.router.__dict__["routes"]:
        if hasattr(route, "tags"):
            tags[route.__dict__["path"]] = route.__dict__["summary"]
    return tags