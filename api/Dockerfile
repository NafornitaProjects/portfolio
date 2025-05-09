FROM node:slim AS base

ARG DATABASE_URI
ARG PAYLOAD_SECRET

ENV DATABASE_URI=$DATABASE_URI \
    MONGODB_URI=$DATABASE_URI \
    PAYLOAD_SECRET=$PAYLOAD_SECRET

WORKDIR /app
RUN corepack enable \
 && corepack prepare pnpm@latest --activate

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY api/package.json api/package.json
RUN pnpm install --frozen-lockfile --filter ./api...

FROM base AS builder

ARG DATABASE_URI
ARG PAYLOAD_SECRET
ENV DATABASE_URI=$DATABASE_URI \
    MONGODB_URI=$DATABASE_URI \
    PAYLOAD_SECRET=$PAYLOAD_SECRET

WORKDIR /app/api
COPY api/ ./
COPY --from=deps /app/node_modules /app/node_modules
RUN pnpm run build

FROM node:slim AS runner

ENV DATABASE_URI= \
    MONGODB_URI= \
    PAYLOAD_SECRET=

WORKDIR /app/api
COPY --from=builder /app/api/.next .next
COPY --from=builder /app/node_modules node_modules
COPY api/package.json .

RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE 3000
CMD ["node", ".next/server/index.js"]
