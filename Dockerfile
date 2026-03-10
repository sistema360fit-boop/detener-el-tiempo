# Usar Node.js 20
FROM node:20-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de package
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Generar Prisma Client para PostgreSQL
RUN npx prisma generate --schema=prisma/schema.prisma

# Construir frontend
RUN npm run build

# Exponer puerto
EXPOSE 4000

# Comando de inicio
CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma && node server/index.js"]
