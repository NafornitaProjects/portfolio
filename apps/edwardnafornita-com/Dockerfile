FROM node:20-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /app
COPY nx.json workspace.json tsconfig.base.json ./
COPY apps ./apps
COPY libs ./libs
RUN pnpm nx build edwardnafornita-com

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=deps    /app/node_modules ./node_modules
COPY --from=build   /app/apps/edwardnafornita-com/.next  ./.next
COPY --from=build   /app/apps/edwardnafornita-com/public ./public
COPY --from=build   /app/package.json          ./
COPY --from=build   /app/pnpm-lock.yaml        ./
EXPOSE 80
CMD ["pnpm", "start", "--", "-p", "80"]
