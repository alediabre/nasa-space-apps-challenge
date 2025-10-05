# pleiades-protocol-main/pleiades-ui/Dockerfile

# Usamos una imagen oficial de Node.js como base
FROM node:20-alpine

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos de dependencias
COPY package*.json ./

# Instalamos las dependencias del proyecto
RUN npm install

# Copiamos el resto del código de la aplicación
COPY . .

# Exponemos el puerto que usa Vite para el servidor de desarrollo
EXPOSE 5173

# El comando para iniciar la aplicación cuando el contenedor se ejecute
# El --host es crucial para que sea accesible desde fuera del contenedor
CMD ["npm", "run", "dev", "--", "--host"]