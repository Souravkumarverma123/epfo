# Same turbo-prune pattern as apps/web/Dockerfile — see the comment there.
# Build from the REPO ROOT:
#   docker build -f apps/api/Dockerfile -t epfo-one-api .
#
# tsup bundles every @repo/* workspace package into dist/index.js (see
# apps/api/tsup.config.ts's noExternal), but leaves real npm dependencies
# (express, @trpc/server, ...) external — so the runner stage still needs
# node_modules, not just dist/.

FROM node:20-alpine AS base

FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo@^2.10.9
COPY . .
RUN turbo prune @repo/api --docker

FROM base AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g pnpm@9.0.0

COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
RUN pnpm turbo run build --filter=@repo/api...

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 apiuser
USER apiuser

# Simplest correct option under time pressure: bring the whole installed
# workspace over (node_modules included) rather than hand-picking a
# production-only subset. Bigger image, zero risk of a missing transitive
# dep at runtime.
COPY --from=installer --chown=apiuser:nodejs /app .

WORKDIR /app/apps/api
ENV PORT=8000
EXPOSE 8000
CMD ["node", "dist/index.js"]
