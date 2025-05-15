# syntax = docker/dockerfile:1.5
FROM node:slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY api/package.json api/
RUN pnpm install --frozen-lockfile --filter api...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app /app
COPY api/ api/
RUN --mount=type=secret,id=mongodb_uri --mount=type=secret,id=payload_secret \
    bash -c "\
      MONGODB_URI=$(cat /run/secrets/mongodb_uri) && \
      PAYLOAD_SECRET=$(cat /run/secrets/payload_secret) && \
      printf 'MONGODB_URI=%s\nPAYLOAD_SECRET=%s\n' \"$MONGODB_URI\" \"$PAYLOAD_SECRET\" > api/.env.local && \
      cd api && pnpm run build && \
      rm api/.env.local\
    "

FROM node:slim AS runner
WORKDIR /app/api
ENV NODE_ENV=production
COPY --from=builder /app/api/.next .next
COPY --from=builder /app/api/public public
COPY --from=deps /app/node_modules node_modules
COPY api/package.json .
RUN addgroup --system app && adduser --system --ingroup app app
USER app
EXPOSE 3000
CMD ["node",".next/server/index.js"]
