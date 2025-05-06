FROM node:slim AS base
WORKDIR /app

FROM base AS deps

RUN corepack enable \
 && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

RUN pnpm install --frozen-lockfile --filter ./backend...

FROM deps AS builder

WORKDIR /app/backend

COPY backend/ ./

RUN pnpm run build

FROM node:slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/backend/.next/standalone ./
COPY --from=builder /app/backend/.next/static ./.next/static
COPY --from=builder /app/backend/server.js ./

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
