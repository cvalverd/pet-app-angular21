# ---- Etapa 1: compilar la app Angular 21 ----
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Etapa 2: servir con el servidor SSR de Angular (Express) ----
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist/pet-app-angular21 ./dist/pet-app-angular21
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev

USER node
ENV PORT=4000
EXPOSE 4000

CMD ["node", "dist/pet-app-angular21/server/server.mjs"]
