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
- **State/Data**: React Query (TanStack) for server state management
- **API Client**: `@elysiajs/eden` for type-safe API calls to `/api/*` (relative paths)
- **Shared Types**: `@comic-sharing/backend` workspace dependency
- **Auth**: Better-Auth with React hook integration via `useAuth()`

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
- `frontend/app/layout.tsx` - Root layout for public (unauthenticated) pages with Geist fonts
- `frontend/app/(protected)/layout.tsx` - Protected layout for authenticated pages with auth-aware navigation header and React Query provider
- `frontend/app/(protected)/page.tsx` - Dashboard page displaying current user's name
- `frontend/app/login/page.tsx` - Login page with email/password form
- `frontend/app/register/page.tsx` - Registration page with email/password/username form
- `frontend/app/api/[...path]/route.ts` - Catch-all API proxy that forwards requests to `BACKEND_TARGET_URL` and returns backend responses (status, body, headers), including cookie passthrough.
- `frontend/app/page.tsx` - Landing page

##### Shared Utilities
- **`frontend/lib/api.ts`** - Eden treaty client configured with `BACKEND_URL = '/api/'` for type-safe backend API calls via the proxy. Used for custom app resources (profile, comics, chapters, roles).
- **`frontend/lib/auth.ts`** - Better-Auth client (`createAuthClient`). Base URL: `/api/auth`. Handles built-in auth (user, session, account, verification).
- **`frontend/hooks/useAuth.ts`** - React Query-based auth hook. Uses `authClient` for sign in/up/out and session queries; uses `api` treaty client for profile creation. Invalidates session queries on mutation success.
- **`frontend/components/auth/AuthForm.tsx`** - Reusable auth form component with built-in submit handler support
- **`frontend/components/auth/InputField.tsx`** - Form input field component
- **`frontend/components/auth/SocialAuthButtons.tsx`** - OAuth provider buttons (Google, GitHub, Discord)
- **`frontend/lib/logger.ts`** - Console-based logger
- **`frontend/constants.ts`** - Frontend configuration; `BACKEND_URL` points to `/api/` (relative). No direct backend host exposed to client.

**Key Distinction**: Better-Auth (`auth.ts`) handles built-in authentication (user identity, sessions); Treaty API (`api.ts`) handles custom application resources (profiles, comics, roles) with full type safety.

##### Configuration
- `frontend/next.config.ts` - Next.js configuration
- `frontend/package.json` - Dependencies including `@comic-sharing/backend` workspace

##### Styling
- Tailwind CSS v4 with PostCSS
- Dark mode via `prefers-color-scheme` using CSS custom properties (`--background`, `--foreground`) mapped to Tailwind theme tokens (`bg-background`, `text-foreground`, etc.) for automatic light/dark theming.

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

### Auth Flow

#### Better-Auth (Built-in Auth)
Handles user identity, sessions, and credentials:
1. **Sign Up**: `authClient.signUp.email()` → Better-Auth endpoint (`/api/auth/sign-up/email`)
   - Creates `user` + `account` records in DB
   - Returns session cookie to client
2. **Sign In**: `authClient.signIn.email()` → Better-Auth validates credentials
   - Returns session cookie
3. **Sign Out**: `authClient.signOut()` → Invalidates session
4. **Session Check**: `authClient.getSession()` → Reads current session state
   - Used by `useAuth()` hook's `sessionQuery`

#### Treaty API (Custom Resources)
Handles application-specific resources with full type safety:
1. **Profile Creation**: `api.api.profile.post({ username })` → POST `/api/profile/`
   - Creates `profile` record linked to authenticated user
   - Assigns RBAC roles via `getInitialRoleIds()`
   - First user gets `adminRole` if `createNewAdmin` app state is true
2. **Profile Queries**: `api.api.profile.get()` → GET `/api/profile/...`
   - Requires valid session (enforced by middleware)
3. **Other Resources**: Comics, chapters, roles accessed similarly via treaty client

#### Session & Authorization Flow
1. **Frontend**: Request → Next.js API route `/api/...` (proxy)
2. **Proxy**: Forwards to `BACKEND_TARGET_URL` + Elysia route (server-side only)
3. **Middleware**: `authenticationMiddleware.userAuth()` or `roleAuth()`
   - Calls `auth.api.getSession({ headers })` to validate session
   - For `userAuth` + `requiredProfile`: verifies profile exists
   - For `roleAuth`: resolves permissions via `resolveUserPermissions(profile.rolesIDs)`
   - Evaluates `PermissionFilter` (e.g., `user:read`)
4. **Backend**: Returns context to handler OR 401/403 error

### Database Layer
- **Drizzle ORM** → Type-safe SQL queries
- **Schema**: `user`, `session`, `account`, `verification` (auth) + `profile`, `role` (app)
- **Separation**: Auth data (`user`) vs business data (`profile`) with 1:1 link

### Type Safety Flow
TypeBox schemas → Drizzle schemas → Database tables
The `speard.ts` utility bridges Drizzle and TypeBox for API contract validation.

## Development Workflow

### Current State
- Basic project scaffolding in place with monorepo setup
- **Authentication system**: Fully implemented with Better-Auth
  - Email/password sign up, sign in, sign out
  - Session management with cookie-based persistence
  - Social auth: Google, GitHub, Discord (backend configured + frontend UI buttons)
  - Database schema: `user`, `session`, `account`, `verification`
  - Frontend: OAuth login/register buttons with redirect flow
- **RBAC system**: Implemented with roles, permissions, and middleware
  - `profile` table extends users with usernames and role assignments
  - `role` table with permission arrays and admin flag
  - Permission filter DSL (`and`/`or`/`not`)
  - Middleware: `userAuth`, `roleAuth`, `optionalAuth`
- **Profile management**: Full CRUD with auth requirements
  - Separation: auth-only (`user`) vs business data (`profile`)
  - First-user admin bootstrapping via `createNewAdmin` app state
- **Type-safe API**: Eden treaty client + TypeBox schemas
- **Frontend auth hook**: `useAuth()` with React Query + `signInWithOAuth()` method
- **Backend**: Elysia.js with OpenAPI/Swagger
- **Database**: Drizzle ORM with PostgreSQL (PGlite for dev)
- **Dev infra**: Docker Compose, Bun workspaces, Tailwind v4

### Missing Features
- **Comic management**: Full CRUD operations (create, update, delete comics and chapters)
- **File upload**: Comic cover images, comic pages
- **Search/Filters**: Comic discovery and filtering
- **Database migrations**: Drizzle migration files not generated
- **Frontend pages**: Application pages beyond landing page
- **Email verification**: Flow not yet wired up
- **Password reset**: Not implemented
- **Advanced RBAC UI**: Role editor, permission assignment interface

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
- Frontend now supports dark mode: dashboard card uses `bg-background` and protected layout header uses `bg-background/80` (theme-aware) to adapt to system dark/light preferences (implemented in `frontend/app/(protected)/dashboard/page.tsx` and `frontend/app/(protected)/layout.tsx`).
## Authentication System

### Overview
The authentication system uses **Better-Auth** for session management, backed by a PostgreSQL database with Drizzle ORM. It supports email/password authentication and social providers (Google, GitHub, Discord). The system implements RBAC (Role-Based Access Control) through a `user` → `profile` → `role` → `permissions` hierarchy.

### Architecture

#### Database Layer
- **`user` table**: Core authentication data (email, name, image, emailVerified)
- **`session` table**: Active user sessions with IP/user-agent tracking
- **`account` table**: OAuth/social provider accounts and password credentials
- **`verification` table**: Email verification tokens
- **`profile` table**: Extended user data (username) and assigned roles (`rolesIDs` array)
- **`role` table**: RBAC roles with permissions array and admin flag

**Key Design**: Separation between `user` (auth-only) and `profile` (business data with RBAC). Profile creation is a separate step after authentication.

#### Backend - Better-Auth Configuration
- **File**: `backend/src/libs/auth.config.ts`
- **Adapter**: Drizzle ORM with PostgreSQL
- **Auth Methods**: Email/password (enabled) + Social OAuth (configured)
- **Session**: Cookie-based with JWT tokens (Better-Auth managed)
- **Security**: Secure cookies in production, cross-subdomain support
- **API**: OpenAPI plugin enabled at `/api/auth`

#### Frontend - Auth Client
- **File**: `frontend/lib/auth.ts`
- **Client**: `createAuthClient` from `better-auth/react`
- **Base URL**: `/api/auth` (proxied through Next.js API routes)
- **Usage**: Type-safe auth operations via `authClient`

#### Auth Hook (Frontend)
- **File**: `frontend/hooks/useAuth.ts`
- **Hook**: `useAuth()` - React Query-based auth state management
- **Session**: `sessionQuery` via `authClient.getSession()`
- **Mutations**: 
  - `signIn` - Email/password sign in
  - `signUp` - Email/password sign up (auto name from email)
  - `createProfile` - Post-signup profile creation (separate API call)
  - `signOut` - Session invalidation
- **State**: All mutations invalidate/clear session queries on success

#### Middleware & Authorization
- **File**: `backend/src/middleware/auth.ts`
- **`userAuth`**: Validates session, optionally requires profile
  - Returns: `{ user, session, profile }`
- **`roleAuth`**: Validates session + profile + permission check
  - Returns: `{ user, session, profile, userPermissions }`
  - Uses `PermissionFilter` DSL for route-level access control
- **`optionalAuth`**: Session optional, returns auth data if present

#### RBAC Permissions System
- **File**: `backend/src/constants/permissions.ts`
- **Format**: `resource:action` (e.g., `user:read`, `role:manage`)
- **Resources**: `user`, `role`
- **Filter DSL**: `and`, `or`, `not` combinators
- **Resolution**: `resolveUserPermissions(roleIds)` aggregates from roles
- **Admin**: `adminRole` flag grants all permissions automatically

#### Profile & Permission Routes
- **File**: `backend/src/routes/profile.ts`
- **Protected by**: `authenticationMiddleware` + `userAuth` guard
- **Endpoints**:
  - `GET /profile/me` - Current user's profile (auth required)
  - `GET /profile/my-permissions` - Current user's permission list
  - `POST /profile/` - Create profile (first user = admin via `createNewAdmin`)
  - `PUT /profile/` - Update profile
  - `GET /profile/` - Get by profileId or userId
  - `GET /profile/list-user` - List all profiles (`user:read` required)
  - `GET /profile/search_user` - Search profiles (`user:read` required)

### Auth Flows

#### Sign Up Flow
1. Frontend: `signUpMutation` → `authClient.signUp.email()`
2. Backend (Better-Auth): Creates `user` + `account` records
3. Better-Auth: Returns session (cookie set)
4. Frontend: `createProfileMutation` → POST `/api/api/profile/`
5. Backend: Creates `profile` with username, assigns roles via `getInitialRoleIds()`
   - First user: Gets admin role if `createNewAdmin` is true

#### Sign In Flow
1. Frontend: `signInMutation` → `authClient.signIn.email()`
2. Backend (Better-Auth): Verifies credentials, creates session
3. Better-Auth: Returns session (cookie set)
4. Frontend: Invalidates session query → triggers refetch
5. Frontend: Fetches profile via `/profile/me`

#### Protected Route Access
1. Frontend: Request → Next.js API route `/api/...`
2. Proxy: Forwards to `BACKEND_TARGET_URL` + Elysia route
3. Middleware: `userAuth()` or `roleAuth()` validates session
   - Calls `auth.api.getSession({ headers })`
   - Validates session + (optional) profile
   - For `roleAuth`: Resolves permissions, evaluates filter
4. Backend: Returns context to handler OR 401/403

#### Sign Out Flow
1. Frontend: `signOutMutation` → `authClient.signOut()`
2. Backend (Better-Auth): Invalidates session
3. Frontend: `queryClient.removeQueries({ queryKey: ["session"] })`

#### OAuth Social Sign-In Flow
1. Frontend: User clicks provider button → `signInWithOAuth(provider)` → redirects to `/api/auth/signin/:provider`
2. Backend (Better-Auth): Generates OAuth authorization URL and redirects to provider (Google/GitHub/Discord)
3. Provider: User authenticates and authorizes the application
4. Provider: Redirects back to backend callback endpoint (`/api/auth/callback/:provider`)
5. Backend (Better-Auth): Exchanges code for tokens, finds/creates `user` and `account` records, establishes session
6. Backend: Redirects to frontend (via `callbackUrl`) with session cookie set
7. Frontend: Page loads → `useAuth` hook refetches session → user is authenticated

#### Session Refresh
- Better-Auth manages token refresh automatically via cookies
- `authClient.getSession()` fetches current session state
- Frontend `sessionQuery` auto-refetches on mount & invalidation

### Security Model

- **Session tokens**: Managed by Better-Auth (JWT in HTTP-only secure cookies)
- **Cookie config**: SameSite=none (prod) / lax (dev), Secure in prod
- **Cross-subdomain**: Enabled for SSO across subdomains
- **Backend isolation**: Host never exposed to browser (Next.js proxy)
- **RBAC**: Role-based access control at route level
- **Profile gating**: `requiredProfile` flag enforces profile creation before app access
- **Admin escalation**: First user gets admin role via `createNewAdmin` app state
- **CSRF protection**: Cookie-based auth with SameSite/Secure attributes

### Social Auth (OAuth)
- **Config**: `backend/src/libs/auth.config.ts` - Social provider settings
- **Providers**: Google, GitHub, Discord (configured, requires env vars)
- **Backend endpoints**: `/api/auth/signin/:provider` handles OAuth flow
- **Flow**: Frontend redirects to `/api/auth/signin/:provider` → Better-Auth handles OAuth callback → creates session + account records
- **Frontend component**: `components/auth/SocialAuthButtons.tsx` - OAuth button group for login/register pages
- **Integration**: `hooks/useAuth.ts` exposes `signInWithOAuth(provider)` function for triggering OAuth redirect
- **Account linking**: Multiple social accounts can link to one `user` via `account` table

### Frontend Integration Patterns

#### Basic Auth Check
```typescript
const { session, sessionLoading } = useAuth();
if (sessionLoading) return <Loading />;
if (!session) return <Login />;
return <App />;
```

#### Protected Mutation
```typescript
const { signIn, signInLoading, signInError } = useAuth();
const handleLogin = async () => {
  await signIn({ email, password });
};
```

#### Role Check
```typescript
// Fetch permissions from /profile/my-permissions
// Check if permission exists in set
```

#### Route Protection (Next.js Middleware)
```typescript
// Check session cookie via proxy, redirect if not authenticated
```

### Backend Route Protection Examples

```typescript
import { authenticationMiddleware } from '../middleware/auth';

// Require session + profile
app.use(authenticationMiddleware).guard({
  userAuth: { requiredProfile: true }
}, (app) => app.get('/protected', ...));

// Require specific permission
app.guard({
  roleAuth: 'user:read'
}, (app) => app.get('/users', ...));
```

### Configuration

#### Environment Variables
- `BETTER_AUTH_SECRET`: Better-Auth secret (required)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`: GitHub OAuth
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`: Discord OAuth
- `BASE_URL`: Backend base URL
- `BACKEND_URL`: Trusted origins (frontend URLs)
- `FRONTEND_URL`: Frontend URL(s) for OAuth redirects (comma-separated)

#### Cookie Configuration
See `auth.config.ts` - Configured for production security:
- Secure: true (prod)
- SameSite: none (prod) / lax (dev)
- Partitioned: true
- Cross-subdomain: enabled

### Error Handling

- **Frontend**: `getEdenErrorMessage()` extracts error messages from Better-Auth responses
- **Backend**: Better-Auth provides typed error responses
- **Session errors**: Query invalidation triggers refetch
- **Permission errors**: 403 responses with `{ success: false, message: "Forbidden" }`

### Testing Auth

1. **Sign up**: POST to auth client → check user + profile created
2. **Sign in**: Verify session cookie set + profile accessible
3. **Protected routes**: Test 401 without session, 403 without permission
4. **Role permissions**: Verify permission resolution from role IDs
5. **Sign out**: Verify session invalidated + queries cleared

### Troubleshooting

**Session not persisting**:
- Check cookie settings (Secure flag in dev?)
- Verify SameSite configuration
- Check browser cookie storage

**401 Unauthorized**:
- Verify session exists: `authClient.getSession()`
- Check cookie sent with request
- Verify middleware configuration

**403 Forbidden**:
- Check user's roles and permissions
- Verify RBAC configuration
- Check `requiredProfile` flag

**Profile not found**:
- User signed up but profile not created
- Check `createNewAdmin` app state
- Verify profile creation flow completed