# Multi-stage build using Turborepo's `prune` — standard pattern for
# building one app out of a pnpm/Turborepo monorepo without dragging every
# other package's deps into the image. Build from the REPO ROOT:
#   docker build -f apps/web/Dockerfile -t epfo-one-web .
#
# base -> builder (prunes the monorepo down to just what `web` needs)
#      -> installer (installs the pruned deps, runs the actual build)
#      -> runner (copies only the Next.js standalone output, runs as non-root)

FROM node:20-alpine AS base

FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo@^2.10.9
COPY . .
RUN turbo prune web --docker

FROM base AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g pnpm@9.0.0

# Install deps from the pruned lockfile/package.jsons first — cached unless
# dependencies actually change.
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Now bring in the pruned source and build. NEXT_PUBLIC_API_URL is baked
# into the client bundle at build time (Next.js convention for
# NEXT_PUBLIC_* vars), so it must be supplied as a build arg, not a runtime
# env var.
COPY --from=builder /app/out/full/ .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm turbo run build --filter=web...

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

ENV PORT=3000
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
