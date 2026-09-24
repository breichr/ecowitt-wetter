# syntax=docker/dockerfile:1

# ---------- Build ----------
FROM node:22-bookworm-slim AS build
# Compiler nur als Fallback, falls für die Plattform kein better-sqlite3-Prebuild existiert
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build && pnpm prune --prod

# ---------- Runtime ----------
# node:*-slim enthält bereits tzdata (für SQLite 'localtime' und TZ).
FROM node:22-bookworm-slim

# PROTOCOL_HEADER/HOST_HEADER: hinter Coolify/Traefik Protokoll und Host aus den Proxy-Headern übernehmen
ENV NODE_ENV=production \
	PORT=3000 \
	TZ=Europe/Vienna \
	DATABASE_PATH=/data/wetterdaten.db \
	PROTOCOL_HEADER=x-forwarded-proto \
	HOST_HEADER=x-forwarded-host \
	BODY_SIZE_LIMIT=64K

WORKDIR /app
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/scripts ./scripts

RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node", "build"]
