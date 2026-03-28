# syntax=docker/dockerfile:1
# Railway: new service → Deploy from GitHub → set Root Directory to `fe` if the repo is a monorepo.
# Set VITE_API_URL (and optional VITE_STUDIO_SLUG) on the service so `npm run build` inlines them.
# Networking → Generate Domain. Redeploy after changing any VITE_* variable.

FROM node:24-alpine AS build
WORKDIR /app

# Husky "prepare" is unnecessary in the image and can fail without .git.
ENV HUSKY=0

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .
RUN npm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
