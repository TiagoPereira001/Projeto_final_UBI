# Bancada: imagem de produção (API + frontend compilado, na mesma origem)

# 1) compila o frontend
FROM node:22-bookworm-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2) instala só as dependências de produção da API
FROM node:22-bookworm-slim AS api
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# 3) imagem final, sem ferramentas de build
FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=api /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/
COPY --from=frontend /app/frontend/dist ./frontend/dist
# nunca correr como root dentro do container
USER node
EXPOSE 3000
CMD ["node", "backend/server.js"]
