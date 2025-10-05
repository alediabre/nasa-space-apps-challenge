from fastapi import APIRouter
from pydantic import BaseModel
from services.horizons_service import get_orbit_elements
import time
router = APIRouter(
    prefix="/horizons",
    tags=["horizons"]
)


# --- Models ---
class OrbitResponse(BaseModel):
    A : float # Semieje mayor
    E : float # excentricidad
    IN : float # inclinacion
    OM : float # nodo ascendente
    W : float # argumento de periapsis
    M0 : float # anomalia media epoca
    PR : float # periodo orbital
    N: float # mov medio rads/dia
    epoch_jd : float # epoca


# routers/horizons_router.py (lo que ya tienes)
@router.get("/earth", response_model=OrbitResponse)
async def earth_orbit():
    #time.sleep(1)
    data_dicc = await get_orbit_elements(command="399", center="10")
    return OrbitResponse(A=data_dicc['A'],
                         E=data_dicc['EC'],
                         IN=data_dicc['IN'],
                         OM=data_dicc['OM'],
                         W=data_dicc['W'],
                         M0=data_dicc['MA'],
                         PR=data_dicc['PR'],
                         N = data_dicc['N'],
                         epoch_jd=data_dicc['JDTDB'])

@router.get("/moon", response_model=OrbitResponse)
async def moon_orbit():
    #time.sleep(1)
    data_dicc = await get_orbit_elements(command="301", center="399")
    return OrbitResponse(A=data_dicc['A'],
                         E=data_dicc['EC'],
                         IN=data_dicc['IN'],
                         OM=data_dicc['OM'],
                         W=data_dicc['W'],
                         M0=data_dicc['MA'],
                         PR=data_dicc['PR'],
                         N = data_dicc['N'],
                         epoch_jd=data_dicc['JDTDB'])

@router.get("/mercury", response_model=OrbitResponse)
async def mercury_orbit():
    #time.sleep(1)
    data_dicc = await get_orbit_elements(command="199", center="10")
    return OrbitResponse(A=data_dicc['A'],
                         E=data_dicc['EC'],
                         IN=data_dicc['IN'],
                         OM=data_dicc['OM'],
                         W=data_dicc['W'],
                         M0=data_dicc['MA'],
                         PR=data_dicc['PR'],
                         N = data_dicc['N'],
                         epoch_jd=data_dicc['JDTDB'])

@router.get("/venus", response_model=OrbitResponse)
async def venus_orbit():
    #time.sleep(1)
    data_dicc = await get_orbit_elements(command="299", center="10")
    return OrbitResponse(A=data_dicc['A'],
                         E=data_dicc['EC'],
                         IN=data_dicc['IN'],
                         OM=data_dicc['OM'],
                         W=data_dicc['W'],
                         M0=data_dicc['MA'],
                         PR=data_dicc['PR'],
                         N = data_dicc['N'],
                         epoch_jd=data_dicc['JDTDB'])

@router.get("/mars", response_model=OrbitResponse)
async def mars_orbit():
    #time.sleep(1)
    data_dicc = await get_orbit_elements(command="499", center="10")
    return OrbitResponse(A=data_dicc['A'],
                         E=data_dicc['EC'],
                         IN=data_dicc['IN'],
                         OM=data_dicc['OM'],
                         W=data_dicc['W'],
                         M0=data_dicc['MA'],
                         PR=data_dicc['PR'],
                         N = data_dicc['N'],
                         epoch_jd=data_dicc['JDTDB'])

@router.get("/jupiter", response_model=OrbitResponse)
async def jupiter_orbit():
    #time.sleep(1)
    data_dicc = await get_orbit_elements(command="599", center="10")
    return OrbitResponse(A=data_dicc['A'],
                         E=data_dicc['EC'],
                         IN=data_dicc['IN'],
                         OM=data_dicc['OM'],
                         W=data_dicc['W'],
                         M0=data_dicc['MA'],
                         PR=data_dicc['PR'],
                         N = data_dicc['N'],
                         epoch_jd=data_dicc['JDTDB'])

@router.get("/saturn", response_model=OrbitResponse)
async def saturn_orbit():
    #time.sleep(1)
    data_dicc = await get_orbit_elements(command="699", center="10")
    return OrbitResponse(A=data_dicc['A'],
                         E=data_dicc['EC'],
                         IN=data_dicc['IN'],
                         OM=data_dicc['OM'],
                         W=data_dicc['W'],
                         M0=data_dicc['MA'],
                         PR=data_dicc['PR'],
                         N = data_dicc['N'],
                         epoch_jd=data_dicc['JDTDB'])

@router.get("/uranus", response_model=OrbitResponse)
async def uranus_orbit():
    #time.sleep(1)
    data_dicc = await get_orbit_elements(command="799", center="10")
    return OrbitResponse(A=data_dicc['A'],
                         E=data_dicc['EC'],
                         IN=data_dicc['IN'],
                         OM=data_dicc['OM'],
                         W=data_dicc['W'],
                         M0=data_dicc['MA'],
                         PR=data_dicc['PR'],
                         N = data_dicc['N'],
                         epoch_jd=data_dicc['JDTDB'])

@router.get("/neptune", response_model=OrbitResponse)
async def neptune_orbit():
    #time.sleep(1)
    data_dicc = await get_orbit_elements(command="899", center="10")
    return OrbitResponse(A=data_dicc['A'],
                         E=data_dicc['EC'],
                         IN=data_dicc['IN'],
                         OM=data_dicc['OM'],
                         W=data_dicc['W'],
                         M0=data_dicc['MA'],
                         PR=data_dicc['PR'],
                         N = data_dicc['N'],
                         epoch_jd=data_dicc['JDTDB'])

@router.get("/pluto", response_model=OrbitResponse)
async def pluto_orbit():
    #time.sleep(1)
    data_dicc = await get_orbit_elements(command="999", center="10")
    return OrbitResponse(A=data_dicc['A'],
                         E=data_dicc['EC'],
                         IN=data_dicc['IN'],
                         OM=data_dicc['OM'],
                         W=data_dicc['W'],
                         M0=data_dicc['MA'],
                         PR=data_dicc['PR'],
                         N = data_dicc['N'],
                         epoch_jd=data_dicc['JDTDB'])