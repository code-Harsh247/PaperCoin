# One image, three jobs (see deploy/compose.yaml):
#   web      next start
#   engine   node engine/index.mjs
#   migrate  node engine/migrate.mjs (runs once per deploy)

FROM node:22-bookworm AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# NEXT_PUBLIC_* values are compiled into the browser bundle, so they must be
# known at build time, not just at run time.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_BACKTEST_WS_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_BACKTEST_WS_URL=$NEXT_PUBLIC_BACKTEST_WS_URL
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
# Owned by node so Next can write its cache under .next/.
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
