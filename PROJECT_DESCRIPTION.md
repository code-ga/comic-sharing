# Comic Sharing - Mono Repository Project

## Overview
A full-stack comic sharing platform built as a monorepo with TypeScript, using Bun.js as the runtime. The project consists of a Next.js frontend and an Elysia.js backend with PostgreSQL database (Drizzle ORM).

## Architecture

### Monorepo Structure
- **Root**: Bun workspace configuration managing shared dependencies
- **Frontend**: Next.js 16 application (workspace: `@comic-sharing/frontend`)
- **Backend**: Elysia.js API server (workspace: `@comic-sharing/backend`)

### Backend Stack
- **Framework**: Elysia.js (web framework)
- **Database**: PostgreSQL with Drizzle ORM
  - Schema defined using Drizzle (pg-core)
  - Migrations via Drizzle Kit
  - PGlite for development, PostgreSQL for production
- **Types**: Type-safe schemas using [@sinclair/typebox](https://github.com/sinclairzx81/typebox)
- **Logging**: Pino logger with caller tracking
- **API Documentation**: OpenAPI/Swagger via `@elysiajs/openapi`

### Frontend Stack
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **API Client**: `@elysiajs/eden` for type-safe API calls to backend
- **Shared Types**: `@comic-sharing/backend` workspace dependency

## Key Files & Responsibilities

### Backend (`backend/`)

#### Database Layer
- `backend/src/database/schema/auth.ts` - User table schema (username, email, password, salt)
- `backend/src/database/schema/relations.ts` - Drizzle relations definitions
- `backend/src/database/schema/index.ts` - Schema exports
- `backend/src/database/schema.ts` - Main schema export barrel
- `backend/src/database/speard.ts` - Utility to spread Drizzle schemas into TypeBox schemas for type-safe API contracts
- `backend/src/database/types.ts` - Type extraction utilities from database schemas
- `backend/src/database/index.ts` - Database connection setup (PostgreSQL/PGlite) and migrations

#### Server Layer
- `backend/src/index.ts` - Elysia app setup with CORS, OpenAPI, and error handlers
- `backend/src/utils/logger.ts` - Pino-based logger with file/line caller tracking
- `backend/src/types/index.ts` - Shared API response types (baseResponse, paginatedResponse, errorResponse)

#### Configuration
- `backend/drizzle.config.ts` - Drizzle Kit configuration for migrations
- `backend/package.json` - Workspace dependencies (bun-types, drizzle-kit)

### Frontend (`frontend/`)

#### Application
- `frontend/app/layout.tsx` - Root layout with Geist fonts
- `frontend/app/page.tsx` - Landing page
- `frontend/next.config.ts` - Next.js configuration

#### Shared Utilities
- `frontend/lib/api.ts` - Eden treaty client for type-safe backend API calls
- `frontend/lib/logger.ts` - Console-based logger
- `frontend/constants.ts` - Environment-based configuration (BACKEND_URL, FRONTEND_URL)

#### Styling
- Tailwind CSS v4 with PostCSS

### Root Configuration
- `package.json` - Bun workspace configuration with catalog dependencies (elysia, @sinclair/typebox)
- `docker-compose.yaml` - Multi-container setup (PostgreSQL, Backend, Frontend)
- `.env.example` - Environment variable template
- `biome.json` - Code formatting/linting (tabs, double quotes)

## Data Flow

1. **Frontend** → **Backend**: Type-safe API calls via Eden treaty client
   - The `@elysiajs/eden` treaty client generates TypeScript types from the Elysia app type
   - Shared types come from `@comic-sharing/backend` workspace

2. **Backend** → **Database**: Drizzle ORM queries
   - Schemas defined with Drizzle pg-core
   - Spread utility converts Drizzle schemas to TypeBox for runtime validation/type inference

3. **Type Safety**: TypeBox schemas → Drizzle schemas → Database tables
   - The `speard.ts` utility bridges Drizzle schemas and TypeBox schemas
   - Ensures API request/response types match database schema types

## Development Workflow

### Current State
- Basic project scaffolding is in place
- Database schema has a `user` table (auth)
- Logger configured on both frontend and backend
- Type-safe API client setup with Eden
- Docker Compose for local development
- No actual API routes implemented yet beyond the root route

### Missing Features
- **Authentication system**: Login, registration, session management
- **Comic management**: CRUD operations for comics
- **File upload**: Comic cover images, comic pages
- **User profiles**: Profile management
- **Search/Filters**: Comic discovery
- **API Routes**: Elysia route handlers (only root route exists)
- **Database migrations**: Drizzle migration files not generated
- **Frontend pages**: Actual application pages beyond landing

## Build & Run

```bash
# Install dependencies
bun install

# Development
cd backend && bun run dev      # Backend on :3000
cd frontend && bun run dev     # Frontend on :3000

# Database
bun run db:push               # Push schema to database
bun run db:migrate            # Run migrations
bun run db:studio             # Drizzle Studio

# Production
bun run build                 # Build both packages
bun run start                 # Start backend
```

## Technical Decisions

1. **Bun Workspaces**: Fast package manager with native TypeScript support and workspace management
2. **Elysia.js**: Type-first web framework that integrates well with TypeScript
3. **Drizzle ORM**: Type-safe SQL ORM that works natively with TypeScript
4. **TypeBox**: Runtime type system compatible with TypeScript static types
5. **PGlite**: Embedded Postgres for development (no external database needed)
6. **Tailwind v4**: New JIT-based engine with improved performance

## Notes

- The project uses Bun's native TypeScript support (no tsconfig needed)
- Workspace dependencies are managed via Bun's catalog feature
- Database URL falls back to `memory://` (PGlite in-memory) when not in production
- Error handling middleware configured for uncaught exceptions and unhandled rejections