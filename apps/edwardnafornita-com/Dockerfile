# Stage 1: Build the app
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the Next.js app
RUN pnpm nx build portfolio

# Stage 2: Run the app with a minimal runtime image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

COPY --from=builder /app/dist/apps/portfolio ./
COPY --from=builder /app/apps/portfolio/public ./public
COPY --from=builder /app/apps/portfolio/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

CMD ["pnpm", "start", "--", "-p", "80"]
EXPOSE 80
