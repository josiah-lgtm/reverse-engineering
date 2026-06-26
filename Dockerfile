# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — build the Vite SPA (produces /app/dist)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Install with the committed lockfile for a reproducible build.
COPY package.json package-lock.json ./
RUN npm ci

# Build: `tsc -b && vite build` (see package.json "build" script).
COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — runtime: serve static SPA + the single /api/publish function
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Only the tiny runtime server's deps (express) — not the whole build toolchain.
COPY deploy/package.json deploy/package-lock.json ./
RUN npm ci --omit=dev

# The runtime server + the Notion publisher.
# api/publish.js uses CommonJS (module.exports); the repo root is "type":"module",
# so we copy it in as .cjs to force CommonJS resolution inside the image.
COPY deploy/server.cjs ./server.cjs
COPY api/publish.js ./api/publish.cjs

# Built static assets from stage 1.
COPY --from=build /app/dist ./dist

EXPOSE 3001
USER node
CMD ["node", "server.cjs"]
