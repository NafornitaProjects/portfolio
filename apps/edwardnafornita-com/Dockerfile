FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm nx build edwardnafornita-com

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

COPY --from=builder /app/apps/edwardnafornita-com/.next ./.next
COPY --from=builder /app/apps/edwardnafornita-com/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

CMD ["pnpm", "start", "--", "-p", "80"]
EXPOSE 80
