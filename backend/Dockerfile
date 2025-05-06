FROM node:slim AS base
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 make g++ libvips-dev \
 && corepack enable \
 && corepack prepare pnpm@latest --activate \
 && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

COPY backend/package.json backend/package.json

RUN pnpm install --frozen-lockfile --filter ./backend...

FROM deps AS builder
WORKDIR /app/backend

COPY backend/ ./

COPY --from=deps /app/node_modules /app/node_modules

RUN pnpm run build

FROM node:slim AS runner
WORKDIR /app/backend

COPY --from=builder /app/backend/.next .next
COPY --from=builder /app/node_modules node_modules
COPY backend/package.json .

RUN addgroup --system app \
 && adduser  --system --ingroup app app

USER app

EXPOSE 3000
CMD ["node", ".next/server/index.js"]
