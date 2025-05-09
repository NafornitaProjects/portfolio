FROM node:slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY api/package.json api/package.json
RUN pnpm install --frozen-lockfile --filter ./api...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app /app
COPY api/ api/
RUN --mount=type=secret,id=DATABASE_URI --mount=type=secret,id=PAYLOAD_SECRET \
    export MONGODB_URI="$(cat /run/secrets/DATABASE_URI)" \
           PAYLOAD_SECRET="$(cat /run/secrets/PAYLOAD_SECRET)" && \
    pnpm --filter ./api... run build

FROM node:slim AS runner
WORKDIR /app/api
COPY --from=builder /app/api/.next .next
COPY --from=builder /app/node_modules /app/node_modules
COPY api/package.json .
RUN addgroup --system app && adduser --system --ingroup app app
USER app
EXPOSE 3000
CMD ["node", ".next/server/index.js"]
