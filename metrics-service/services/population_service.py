import rasterio
import numpy as np
import shapely.geometry as geometry
from shapely.ops import transform as shapely_transform
import pyproj
from rasterio.features import rasterize


# --- CONFIG ---
RASTER_HIGHRES_PATH = "data/GHS_POP_E2025_GLOBE_R2023A_54009_100_V1_0.tif" # 100 m
RASTER_LOWRES_PATH = "data/GHS_POP_E2025_GLOBE_R2023A_54009_1000_V1_0.tif"  # 1 km
SUPERRES = 4  # Supersampling factor for edges, the greater the more precise but slower
THRESHOLD_SUPERRES = 1200000  #threshold to disable superres (1,200 km)
THRESHOLD_RADIUS_M = 100000  #threshold to switch between resolutions (100 km)

# --- load rasters in memory ---
try:
    src_high = rasterio.open(RASTER_HIGHRES_PATH)
    src_low = rasterio.open(RASTER_LOWRES_PATH)
    proj_to_raster_high = pyproj.Transformer.from_crs("EPSG:4326", src_high.crs, always_xy=True).transform
    proj_to_raster_low = pyproj.Transformer.from_crs("EPSG:4326", src_low.crs, always_xy=True).transform    
except IOError: 
    src_high = None 
    src_low = None 
    proj_to_raster_high = None 
    proj_to_raster_low = None 
    



def estimate_population(lon: float, lat: float, radius_m: float) -> int:
    ''' Estimate population within a circle defined by (lon, lat) center and radius in meters. 
        Uses supersampling to improve edge accuracy.
    
        Returns a population estimate.
        
        Args:
            lon (float): Longitude of circle center in WGS84
            lat (float): Latitude of circle center in WGS84
            radius_m (float): Radius of circle in meters
        
        Returns:
            int: Estimated population within the circle
    '''

    # Select raster and projection based on radius
    src, proj_to_raster = select_raster_and_transform(radius_m)
    nodata = src.nodata

    # Get circle in raster CRS
    circle = get_proyected_circle(lon, lat, radius_m, proj_to_raster)

    # Circle bounds in raster indices
    minx, miny, maxx, maxy = circle.bounds
    row_min, col_min = src.index(minx, maxy)
    row_max, col_max = src.index(maxx, miny)

    # Limits adjustment
    row_min, col_min = max(0, row_min), max(0, col_min)
    row_max, col_max = min(src.height - 1, row_max), min(src.width - 1, col_max)

    nrows, ncols = row_max - row_min + 1, col_max - col_min + 1
    if nrows <= 0 or ncols <= 0:
        return 0

    window = rasterio.windows.Window(col_min, row_min, ncols, nrows)
    data = src.read(1, window=window, boundless=True)
    window_transform = src.window_transform(window)

    # Rasterize the circle to the window grid
    # Supersampling: create a finer grid, rasterize, and reduce
    if SUPERRES > 1 and radius_m < THRESHOLD_SUPERRES:
        highres_shape = (nrows * SUPERRES, ncols * SUPERRES)
        mask_hr = rasterize(
            [(geometry.mapping(circle), 1)],
            out_shape=highres_shape,
            transform=window_transform * rasterio.Affine.scale(1 / SUPERRES),
            fill=0,
            dtype="float32",
        )
        # Reduce: average SUPERRES×SUPERRES blocks to get fraction [0..1]
        mask = mask_hr.reshape(nrows, SUPERRES, ncols, SUPERRES).mean(axis=(1, 3))
    else:
        mask = rasterize(
            [(geometry.mapping(circle), 1)],
            out_shape=(nrows, ncols),
            transform=window_transform,
            fill=0,
            dtype="float32",
        )

    # Multiply raster values by mask (covered fraction)
    valid = (nodata is None) or (data != nodata)
    pop_est = int(np.sum(data[valid] * mask[valid]).round())

    return pop_est


def select_raster_and_transform(radius_m: float) -> tuple[rasterio.io.DatasetReader, callable]:
    if radius_m > THRESHOLD_RADIUS_M:
        return src_low, proj_to_raster_low
    else:
        return src_high, proj_to_raster_high
    

def get_proyected_circle(lon: float, lat: float, radius_m: float,
                         proj_to_raster: callable) -> geometry.Polygon:
    ''' Get a shapely circle in the raster CRS from lon, lat and radius in meters.
    
        Args:
            lon (float): Longitude of circle center in WGS84
            lat (float): Latitude of circle center in WGS84
            radius_m (float): Radius of circle in meters
            proj_to_raster (callable): Function to project from WGS84 to raster CRS

        Returns:
            shapely.geometry.Circle: The projected circle in the raster CRS
    '''
    # Proyected point to CRS raster
    pt = geometry.Point(lon, lat)
    pt_proj = shapely_transform(proj_to_raster, pt)
    circle = pt_proj.buffer(radius_m)
    return circle
