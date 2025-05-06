FROM node:slim AS builder
RUN corepack enable \
  && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
RUN pnpm fetch

COPY frontend/package.json frontend/next.config.js ./
COPY frontend/ ./

RUN pnpm install --frozen-lockfile && pnpm run build

FROM node:slim AS runner

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
USER nextjs

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

EXPOSE 3000
CMD ["pnpm", "start"]
