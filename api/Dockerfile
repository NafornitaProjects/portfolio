FROM node:slim AS builder
WORKDIR /app

RUN corepack enable \
 && corepack prepare pnpm@10 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY api/package.json api/

RUN pnpm install --frozen-lockfile --filter api...

COPY api/ api/
RUN cd api && pnpm run build
