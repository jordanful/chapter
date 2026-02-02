FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/server ./apps/server

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN cd apps/server && pnpm db:generate

# Build
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/server ./apps/server
COPY pnpm-workspace.yaml package.json tsconfig.json ./

# Build the app
RUN cd apps/server && pnpm build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 chapter

# Copy built app
COPY --from=builder --chown=chapter:nodejs /app/apps/server/dist ./dist
COPY --from=builder --chown=chapter:nodejs /app/apps/server/node_modules ./node_modules
COPY --from=builder --chown=chapter:nodejs /app/apps/server/package.json ./
COPY --from=builder --chown=chapter:nodejs /app/apps/server/prisma ./prisma
COPY --from=builder --chown=chapter:nodejs /app/apps/server/seed-books ./seed-books

# Create data directory (SQLite database, books, audio cache)
RUN mkdir -p /app/data/books /app/data/audio && chown -R chapter:nodejs /app/data

# Startup script to run migrations and start server
COPY --chown=chapter:nodejs apps/server/docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

USER chapter

EXPOSE 3001

CMD ["/app/docker-entrypoint.sh"]
