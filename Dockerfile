# Base image con Node.js 22 (versión actual estable sugerida en package.json)
FROM node:22-bullseye

# Instalar dependencias necesarias para audio y descargas
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python-is-python3 \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias del bot
RUN npm install --production

# Copiar el resto del código
COPY . .

# Exponer el puerto del KeepAlive (por defecto 3000)
EXPOSE 3000

# Comando para iniciar el bot
CMD ["npm", "start"]
