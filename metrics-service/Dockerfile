# pleiades-protocol-main/metrics-service/Dockerfile

FROM python:3.12-slim

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Instala dependencias del sistema (si son necesarias, como para la librería gdal)
RUN apt-get update && apt-get install -y \
    g++ \
    gcc \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

# Copia el archivo de requerimientos de Python
COPY requirements.txt .

# Instala los paquetes de Python
RUN pip install --no-cache-dir -r requirements.txt

# --- CORRECCIÓN DEFINITIVA AQUÍ ---
# Copia TODO el código fuente del servicio (incluyendo models, routers, etc.)
# al directorio de trabajo /app del contenedor.
COPY . .

# Comando para iniciar el servidor cuando el contenedor se ejecute
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]