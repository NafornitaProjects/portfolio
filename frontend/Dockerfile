FROM node:slim AS base
WORKDIR /app

RUN corepack enable \
 && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY package.json ./

RUN pnpm install --frozen-lockfile --filter frontend...

FROM deps AS frontend-builder
WORKDIR /app/frontend
COPY frontend/ ./

COPY --from=deps /app/node_modules /app/node_modules

RUN pnpm run build

FROM nginx:stable-alpine AS frontend-runner
WORKDIR /usr/share/nginx/html

COPY --from=frontend-builder /app/frontend/out ./

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
