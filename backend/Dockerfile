FROM node:slim AS base
WORKDIR /app

RUN corepack enable \
 && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY package.json ./

# install only frontend + backend deps at once
RUN pnpm install --frozen-lockfile --filter backend...

FROM deps AS backend-builder
WORKDIR /app/backend
COPY backend/ ./

COPY --from=deps /app/node_modules /app/node_modules

RUN pnpm run build

FROM node:slim AS backend-runner
WORKDIR /app/backend

COPY --from=backend-builder /app/backend/.next .next
COPY --from=backend-builder /app/node_modules node_modules
COPY --from=backend-builder /app/backend/package.json ./

RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s \
  CMD curl --fail http://localhost:3000/health || exit 1

CMD ["node", ".next/server/index.js"]