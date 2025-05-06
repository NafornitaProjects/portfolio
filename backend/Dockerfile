FROM node:slim AS base
WORKDIR /app
RUN corepack enable \
 && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

RUN pnpm install --frozen-lockfile --filter ./backend...

FROM deps AS builder
WORKDIR /app/backend
COPY backend/ ./
RUN pnpm run build

FROM node:slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs \
 && mkdir .next

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/server.js ./

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
