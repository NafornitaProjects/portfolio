FROM node:slim AS base
WORKDIR /app

RUN corepack enable \
 && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY frontend/package.json frontend/package.json

RUN pnpm install --frozen-lockfile --filter ./frontend...

FROM deps AS builder
WORKDIR /app/frontend

COPY frontend/ ./
COPY --from=deps /app/node_modules /app/node_modules

RUN pnpm run build \
 && pnpm run export

FROM nginx:stable-alpine AS runner
WORKDIR /usr/share/nginx/html

COPY --from=builder /app/frontend/out ./

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
