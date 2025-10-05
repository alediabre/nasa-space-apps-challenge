# pleiades-protocol-main/metrics-service/routers/impacts.py

from fastapi import APIRouter

from . import impact_energy, impact_effects

router = APIRouter(
    prefix="/impacts",
    tags=["impacts"]
)

# Incluimos las rutas de los otros archivos para que estén disponibles
# bajo el prefijo /impacts
router.include_router(impact_energy.router)
router.include_router(impact_effects.router)