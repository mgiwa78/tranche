# Build context: repository root (docker build -f api/Dockerfile .)
# 1. prune  -> a minimal workspace containing only api + shared
# 2. build  -> compile shared and api
# 3. deps   -> production node_modules only
# 4. runner -> dist + prod deps, runs migrations then starts

FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS pruner
COPY . .
RUN npx --yes turbo@2.11.8 prune api --docker

FROM base AS builder
COPY --from=pruner /repo/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
RUN pnpm turbo run build --filter=api

FROM base AS deps
COPY --from=pruner /repo/out/json/ .
RUN pnpm install --frozen-lockfile --prod && mkdir -p api/node_modules shared/node_modules

FROM node:24-alpine AS runner
ENV NODE_ENV=production
WORKDIR /repo
RUN apk add --no-cache tini
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/api/node_modules ./api/node_modules
COPY --from=deps /repo/shared/node_modules ./shared/node_modules
COPY --from=builder /repo/shared/package.json ./shared/package.json
COPY --from=builder /repo/shared/dist ./shared/dist
COPY --from=builder /repo/api/package.json ./api/package.json
COPY --from=builder /repo/api/dist ./api/dist
COPY api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && chown -R node:node /repo
USER node
WORKDIR /repo/api
EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--", "docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
