# Build context: repository root (docker build -f web/Dockerfile .)
# Vercel is the primary host for web; this image is for docker compose and self-hosting.

FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS pruner
COPY . .
RUN npx --yes turbo@2.11.8 prune web --docker

FROM base AS builder
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1
COPY --from=pruner /repo/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
RUN pnpm turbo run build --filter=web

FROM node:24-alpine AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=builder --chown=node:node /repo/web/.next/standalone ./
COPY --from=builder --chown=node:node /repo/web/.next/static ./web/.next/static
COPY --from=builder --chown=node:node /repo/web/public ./web/public
USER node
EXPOSE 3000
CMD ["node", "web/server.js"]
