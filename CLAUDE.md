# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chapter is a self-hosted monorepo application for reading books and listening to AI-narrated audiobooks with seamless progress sync between modes. Built with TypeScript, Fastify (backend), Next.js 14 (frontend), and Kokoro TTS.

## Common Commands

**Root commands (run from project root):**
```bash
pnpm install          # Install all dependencies
pnpm dev              # Start all dev servers (web:3000, server:3001)
pnpm build            # Build all packages
pnpm test             # Run all tests (Vitest)
pnpm lint             # Lint across monorepo
pnpm format           # Format with Prettier
```

**Server-specific (apps/server):**
```bash
pnpm db:push          # Push Prisma schema to DB (development)
pnpm db:migrate       # Create database migration
pnpm db:generate      # Generate Prisma client
pnpm db:studio        # Open Prisma Studio UI
```

**Running a single test:**
```bash
pnpm test -- --filter=@chapter/server --testNamePattern="test name"
# Or from specific workspace:
cd apps/server && pnpm test path/to/test.test.ts
```

## Architecture

```
chapter/
├── apps/
│   ├── server/          # Fastify backend (port 3001)
│   │   ├── src/modules/ # Feature modules (auth, books, progress, tts, users)
│   │   ├── src/core/    # Infrastructure (config, database, redis, storage)
│   │   └── prisma/      # Database schema
│   └── web/             # Next.js 14 frontend (port 3000)
│       ├── src/app/     # App Router routes
│       ├── src/components/  # React components (ui/, reader/, library/)
│       └── src/lib/     # Hooks, stores (Zustand), API client
├── packages/
│   ├── types/           # Shared TypeScript definitions
│   ├── utils/           # Tokenizer, progress calculator
│   └── epub-parser/     # EPUB processing
└── services/kokoro/     # Python TTS service (port 5001)
```

**Key architectural patterns:**
- **Multi-level position tracking**: Progress stored at chapter/paragraph/token/character level for precise read↔audiobook sync
- **Modular Fastify plugins**: Each feature in `modules/` is a self-contained Fastify plugin
- **Offline-first web**: IndexedDB + Service Worker for PWA support
- **Workspace dependencies**: Shared types/utils via `@chapter/*` packages

## Database

SQLite with Prisma ORM. Key models: User, Book, Chapter, Paragraph, ReadingProgress, TTSCache.

Database file: `apps/server/data/chapter.db` (dev) or `/app/data/chapter.db` (Docker)

When modifying `prisma/schema.prisma`:
1. Run `pnpm db:generate` to update Prisma client
2. Run `pnpm db:push` (dev) or `pnpm db:migrate` (production) to apply changes

## Testing

Vitest for all tests. Tests live in `__tests__/` directories or as `.test.ts` files.

```bash
pnpm test              # All tests
pnpm test:ui           # Visual test interface
pnpm test:coverage     # Coverage report
```

## Code Conventions

- Strict TypeScript (no `any` types)
- Types exported from `@chapter/types` package
- File naming: `kebab-case.ts`, Components: `PascalCase.tsx`
- Commit format: `type(scope): subject` (e.g., `feat(books): add EPUB upload`)

## Docker Services

Full deployment uses 5 services: Redis, Kokoro TTS, Server (with SQLite), Web, Caddy (reverse proxy). See root `docker-compose.yml` for production or `docker/docker-compose.yml` for development.
