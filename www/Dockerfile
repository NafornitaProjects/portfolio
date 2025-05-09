FROM node:slim AS base
WORKDIR /app

RUN corepack enable \
 && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY www/package.json www/package.json

RUN pnpm install --frozen-lockfile --filter ./www...

FROM deps AS builder
WORKDIR /app/www

COPY www/ ./
COPY --from=deps /app/node_modules /app/node_modules

RUN pnpm run build \
 && pnpm run export

FROM nginx:stable-alpine AS runner
WORKDIR /usr/share/nginx/html

COPY --from=builder /app/www/out ./

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
