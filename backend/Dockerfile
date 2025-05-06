FROM node:slim AS base

WORKDIR /app

FROM base AS deps

RUN corepack enable \
 && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

RUN pnpm fetch \
 && pnpm install --frozen-lockfile

FROM deps AS builder

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN pnpm run build

FROM base AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs \
 && mkdir /app/.next

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/server.js ./server.js

USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
