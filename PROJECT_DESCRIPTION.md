# Comic Sharing - Mono Repository Project

## Overview
A full-stack comic sharing platform built as a monorepo with TypeScript, using Bun.js as the runtime. The project consists of a Next.js frontend and an Elysia.js backend with PostgreSQL database (Drizzle ORM).

## Architecture

### Monorepo Structure
- **Root**: Bun workspace configuration managing shared dependencies
- **Frontend**: Next.js 16 application (workspace: `@comic-sharing/frontend`) with API route proxy at `/api/*`
- **Backend**: Elysia.js API server (workspace: `@comic-sharing/backend`)

### Request Flow
1. Client → Frontend (same-origin): `GET /api/permissions` → Next.js API route at `frontend/app/api/[...path]/route.ts`
2. Frontend proxy → Backend: Forwards request to `BACKEND_TARGET_URL` (server-side only)
3. Backend → Database: Elysia routes handle business logic and Drizzle queries
4. Response flows back through the proxy to the client

This proxy hides the actual backend host from the browser, allows changing backend URL via environment variables, and avoids CORS complications.

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
- **Framework**: Next.js 16 (App Router) with server-side API routes for proxying
- **Styling**: Tailwind CSS v4
- **API Client**: `@elysiajs/eden` for type-safe API calls to `/api/*` (relative paths)
- **Shared Types**: `@comic-sharing/backend` workspace dependency

### Configuration
- **Backend target URL** (`BACKEND_TARGET_URL`): Server-side env var that points to the real backend (e.g., `http://localhost:3001` or `http://backend:3001` in Docker). Not exposed to the browser.
- **Frontend constant** (`frontend/constants.ts`): `BACKEND_URL = '/api/'` — used by Eden client to call the proxy.

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
- `backend/src/types/index.ts` - Shared API response types (baseResponse, paginatedResponse, cursorPaginatedResponse, errorResponse)
- `backend/src/routes/comic.ts` - Comic cluster routes with cursor-based pagination (keyset pagination)
  - `GET /cluster/latest-update` — Comics ordered by `updated_at DESC` with cursor
  - `GET /cluster/recently-added` — Comics ordered by `created_at DESC` with cursor
  - `GET /cluster/recommended` — Same as latest update (placeholder for recommendation algorithm)
  - Cursor encoding: base64-encoded JSON `{ ts: ISO string, id: number }`
  - Database: Uses composite index `(updated_at, id)` and `(created_at, id)` for O(1) pagination efficiency

#### Configuration
- `backend/drizzle.config.ts` - Drizzle Kit configuration for migrations
- `backend/package.json` - Workspace dependencies (bun-types, drizzle-kit)

#### Frontend (`frontend/`)

##### Application
- `frontend/app/layout.tsx` - Root layout with Geist fonts
- `frontend/app/page.tsx` - Landing page
- `frontend/app/api/[...path]/route.ts` - Catch-all API proxy that forwards requests to `BACKEND_TARGET_URL` and returns backend responses (status, body, headers), including cookie passthrough.

##### Shared Utilities
- `frontend/lib/api.ts` - Eden treaty client configured with `BACKEND_URL = '/api/'` for type-safe backend API calls via the proxy
- `frontend/lib/logger.ts` - Console-based logger
- `frontend/constants.ts` - Frontend configuration; `BACKEND_URL` points to `/api/` (relative). No direct backend host exposed to client.

##### Configuration
- `frontend/next.config.ts` - Next.js configuration
- `frontend/package.json` - Dependencies including `@comic-sharing/backend` workspace

##### Styling
- Tailwind CSS v4 with PostCSS

### Root Configuration
- `package.json` - Bun workspace configuration with catalog dependencies (elysia, @sinclair/typebox)
- `docker-compose.yaml` - Multi-container setup (PostgreSQL, Backend, Frontend). The `frontend` service receives `BACKEND_TARGET_URL` env var.
- `.env.example` - Environment variable template including `BACKEND_TARGET_URL` for the frontend proxy.
- `biome.json` - Code formatting/linting (tabs, double quotes)

## Environment Variables

| Variable | Scope | Description | Example |
|----------|-------|-------------|---------|
| `BACKEND_TARGET_URL` | Server-side (frontend) | Target URL where the backend is running. Used by the Next.js API proxy at `/api/*`. | `http://localhost:3001` or `http://backend:3001` |
| `POSTGRES_*`, `DATABASE_URL` | Backend/DB | Database connection configuration | — |
| `PORT` | Backend | Port the Elysia server listens on | `3001` |
| `NODE_ENV` | Backend | Environment mode | `production` |

## Data Flow

1. **Frontend** → **Proxy** → **Backend**: Type-safe API calls via Eden treaty use relative path `/api/...` which hit Next.js API route `frontend/app/api/[...path]/route.ts`. This route forwards the request to the backend URL defined by the server-side `BACKEND_TARGET_URL` and relays the response back to the client.

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
- **Comic management**: Full CRUD operations (create, update, delete comics and chapters)
- **File upload**: Comic cover images, comic pages
- **User profiles**: Profile management
- **Search/Filters**: Comic discovery
- **Database migrations**: Drizzle migration files not generated
- **Frontend pages**: Actual application pages beyond landing

## Build & Run

```bash
# Install dependencies
bun install

# Development
cd backend && bun run dev      # Backend on :3001
cd frontend && BACKEND_TARGET_URL=http://localhost:3001 bun run dev     # Frontend on :3000 with proxy

# Database
bun run db:push               # Push schema to database
bun run db:migrate            # Run migrations
bun run db:studio             # Drizzle Studio

# Production (Docker)
docker compose up

# Notes
- The frontend Eden client calls '/api/*' → Next.js API route → BACKEND_TARGET_URL.
- Set BACKEND_TARGET_URL as a server-side environment variable. It is never exposed to browsers.
```

## Technical Decisions

1. **Bun Workspaces**: Fast package manager with native TypeScript support and workspace management
2. **Elysia.js**: Type-first web framework that integrates well with TypeScript
3. **Drizzle ORM**: Type-safe SQL ORM that works natively with TypeScript
4. **TypeBox**: Runtime type system compatible with TypeScript static types
5. **PGlite**: Embedded Postgres for development (no external database needed)
6. **Tailwind v4**: New JIT-based engine with improved performance

## Comic API

### Cursor-Based Pagination (Keyset Pagination)
All cluster comic endpoints use efficient cursor-based pagination instead of `OFFSET`. This provides consistent performance even with millions of rows by leveraging indexed column comparisons.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit`   | number | Items per page (default: `10`, min: `1`, max: `100`) |
| `cursor`  | string | Opaque base64-encoded cursor from previous response's `nextCursor` |
| *(no `page`)* | — | Page number is not used — navigation is purely cursor-based |

**Response Format:**
```json
{
  "success": true,
  "message": "Comics fetched successfully",
  "data": {
    "items": [...],        // Array of comic objects
    "total": 150,          // Total number of comics in database
    "limit": 10,           // Items per page requested
    "nextCursor": "eyJ0cyI6IjIwMjYtMDQtMjciLCJpZCI6MTIzfQ==" // Present if more pages exist
  },
  "timestamp": 1234567890
}
```

The `nextCursor` encodes composite key `(updated_at, id)` (or `(created_at, id)`). To fetch the next page, pass this cursor value. When `nextCursor` is absent, you've reached the last page.

**How it works:**
- Query uses composite `(timestamp_column, id)` comparison: `(col1, id) < (cursor_ts, cursor_id)`
- Index used: `(updated_at, id)` or `(created_at, id)` — both columns in ascending order
- Database performs index range scan — avoids `OFFSET`'s linear scan cost
- Sorting: `ORDER BY column DESC, id DESC` ensures deterministic ordering

**Example flow:**
1. `GET /cluster/latest-update?limit=10` → returns 10 items + `nextCursor`
2. `GET /cluster/latest-update?limit=10&cursor=<nextCursor>` → returns next 10 items
3. Repeat until `nextCursor` is `null`

### Available Comic Endpoints
| Endpoint | Order By Column | Notes |
|----------|----------------|-------|
| `GET /cluster/latest-update` | `updated_at DESC, id DESC` | Latest updated comics |
| `GET /cluster/recently-added` | `created_at DESC, id DESC` | Recently added comics |
| `GET /cluster/recommended` | `updated_at DESC, id DESC` | Placeholder — currently same as latest update |

Note: Chapters are not included in the comic response. Frontend should request chapters separately using comic-specific endpoints (to be implemented).

## Notes

- The project uses Bun's native TypeScript support (no tsconfig needed)
- Workspace dependencies are managed via Bun's catalog feature
- Database URL falls back to `memory://` (PGlite in-memory) when not in production
- Error handling middleware configured for uncaught exceptions and unhandled rejections
- The frontend API proxy (`frontend/app/api/[...path]/route.ts`) enforces server-side routing; the real backend host is never exposed to browser clients. This simplifies CORS and allows backend URL changes without frontend deploy.
- When running locally, set `BACKEND_TARGET_URL` in your shell: `export BACKEND_TARGET_URL=http://localhost:3001` (Unix) or `$env:BACKEND_TARGET_URL="http://localhost:3001"` (PowerShell) before starting `bun dev` in the frontend directory.
- In Docker Compose, the variable is injected into the frontend container automatically.
- The proxy uses Node.js runtime (`export const runtime = 'nodejs'`) to ensure `process.env` access and consistent server-side fetch behavior.