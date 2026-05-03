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
- **Database Tooling**: Drizzle Studio integrated via backend proxy at `/db/studio` (using `ghcr.io/drizzle-team/gateway`)

### Database Schema
- All comic-related entities (comics, chapters, chapterPages, chapterPageSubtitles) require an `authorId` field referencing the profile table.
- Profile table stores user profile information including username, roles, and system flags.
- For system-generated or automated actions, use the system user ID provided by `backend/src/utils/system-user.ts` to avoid foreign key constraint errors.
- User table is used only for authentication; profile data contains user information and roles.

### Frontend Stack
- **Framework**: Next.js 16 (App Router) with server-side API routes for proxying
- **Styling**: Tailwind CSS v4 with Dracula theme (dark purple/cyan/pink palette)
- **State/Data**: React Query (TanStack) for server state management
- **API Client**: `@elysiajs/eden` for type-safe API calls to `/api/*` (relative paths)
- **Shared Types**: `@comic-sharing/backend` workspace dependency
- **Auth**: Better-Auth with React hook integration via `useAuth()`
- **Design**: Claude-inspired minimalism with glassmorphism effects, smooth rounded corners (`rounded-xl`, `rounded-2xl`), and subtle shadows

### Configuration
- **Backend target URL** (`BACKEND_TARGET_URL`): Server-side env var that points to the real backend (e.g., `http://localhost:3001` or `http://backend:3001` in Docker). Not exposed to the browser.
- **Frontend constant** (`frontend/constants.ts`): `BACKEND_URL = '/api/'` — used by Eden client to call the proxy.

## Key Files & Responsibilities

### Backend (`backend/`)

#### Server Layer
- `backend/src/index.ts` - Elysia app setup with CORS, OpenAPI, and error handlers
- `backend/src/utils/logger.ts` - Pino-based logger with file/line caller tracking
- `backend/src/utils/system-user.ts` - Utility functions for managing the system user account. Provides `getOrCreateSystemUser()` to ensure a system user and profile exist in the database for automated actions, and `getSystemUserId()` and `getSystemProfileId()` to retrieve their IDs. Used when authorId is required for system-generated entities (comics, chapters, etc.) to avoid relation errors.
- `backend/src/types/index.ts` - Shared API response types (baseResponse, paginatedResponse, cursorPaginatedResponse, errorResponse)
- `backend/src/routes/comic.ts` - Comic CRUD routes with cursor-based pagination and file upload support. Updated to use multipart/form-data for both POST and PUT endpoints, with proper handling of categories and genres as arrays.
- `backend/src/routes/studio.ts` - Proxy router for Drizzle Studio. Forwards requests to the internal Docker service, rewrites HTML asset paths, and bridges WebSocket connections for real-time updates. Hidden from OpenAPI docs.
- `backend/scripts/generate-masterpass.ts` - Utility script to generate a secure random `MASTERPASS` for Drizzle Studio Gateway.

#### Configuration
- `backend/drizzle.config.ts` - Drizzle Kit configuration for migrations
- `backend/package.json` - Workspace dependencies (bun-types, drizzle-kit)

#### Frontend (`frontend/`)

##### Application
- `frontend/app/layout.tsx` - Root layout for public (unauthenticated) pages with Geist fonts
- `frontend/app/(protected)/layout.tsx` - Protected layout for authenticated pages with auth-aware navigation header and React Query provider
- `frontend/app/(protected)/dashboard/page.tsx` - Main management dashboard for comics and chapters.
- `frontend/app/(protected)/onboarding/page.tsx` - Page for profile creation and onboarding.
- `frontend/app/(protected)/comics/create/page.tsx` - Page for creating new comics with thumbnail upload.
- `frontend/app/(protected)/comics/[comicId]/edit/page.tsx` - Page for editing existing comics.
- `frontend/app/(protected)/comics/[comicId]/chapters/create/page.tsx` - Page for adding new chapters to a comic.
- `frontend/app/(protected)/comics/[comicId]/chapters/[chapterId]/edit/page.tsx` - Page for editing chapter details.
- `frontend/app/comics/[comicId]/page.tsx` - Public comic detail page. Displays comic information and chapter list. Authors see edit tools, chapter management (edit/delete), and add chapter button. Regular users see read-only chapter list with links to read.
- `frontend/app/comics/layout.tsx` - Layout wrapper for the comics section. Provides a consistent top navigation bar with a "Back to Home" link and wraps child pages in a structured container. Applies to all routes under `/comics/*`.
- `frontend/app/comics/[comicId]/chapters/[chapterId]/read/page.tsx` - Public chapter reading page featuring a responsive three-column layout. Uses `ReaderHeader` component for top navigation and chapter controls. Displays all chapter pages with OCR sidebars.
- `frontend/app/login/page.tsx` - Login page with email/password form
- `frontend/app/register/page.tsx` - Registration page with email/password/username form
- `frontend/app/api/[...path]/route.ts` - Catch-all API proxy that forwards requests to `BACKEND_TARGET_URL` and returns backend responses (status, body, headers), including cookie passthrough.
- `frontend/app/page.tsx` - Landing page displaying comics in three sections (Recommended, Latest Updates, New Additions) using React Query and ComicCard components. Implements loading, error, and empty states. Fetch data from public endpoints (`/comics/latest-update`, `/comics/recently-added`, `/comics/recommended`).

##### Components
- **`frontend/components/Navbar.tsx`** - Reusable navigation bar component with two variants:
  - `public`: Displays gradient logo, Sign in link, and Get Started button (for landing and auth pages)
  - `protected`: Displays logo, user greeting ("Hello, {name}"), and Sign out button (for authenticated area)
  - Replaces inline header code from `app/page.tsx` (home) and `app/(protected)/layout.tsx` (protected area).
- **`frontend/components/ReaderHeader.tsx`** - Header and navigation component for comic reading pages. Displays comic title breadcrumb, current chapter info, chapter selector dropdown, and prev/next chapter buttons. Replaces inline header and navigation from `app/comics/[comicId]/chapters/[chapterId]/read/page.tsx`.
- **`frontend/components/ChapterList.tsx`** - Reusable chapter list component with edit/delete actions
- **`frontend/components/ComicCard.tsx`** - Reusable comic card component for displaying comic metadata (thumbnail, title, description, categories) in a responsive grid. Links to the public comic detail page (`/comics/[id]`). Follows the Dracula theme with `glass` styling, hover effects, and rounded corners.

##### Shared Utilities
- **`frontend/lib/api.ts`** - Eden treaty client configured with `BACKEND_URL = '/api/'` for type-safe backend API calls via the proxy. Used for custom app resources (profile, comics, chapters, roles).
- **`frontend/lib/auth.ts`** - Better-Auth client (`createAuthClient`). Base URL: `/api/auth`. Handles built-in auth (user, session, account, verification).
- **`frontend/hooks/useAuth.ts`** - React Query-based auth hook. Uses `authClient` for sign in/up/out and session queries; uses `api` treaty client for profile creation. Invalidates session queries on mutation success.
- **`frontend/components/auth/AuthForm.tsx`** - Reusable auth form component with built-in submit handler support
- **`frontend/components/auth/InputField.tsx`** - Form input field component with Dracula theme
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
   - **Onboarding Flow**: 
  - Authenticated users without a profile are redirected to `/onboarding` via `ProtectedLayout`.
  - Onboarding page allows users to create a unique profile (username).
  - Profile presence is tracked in `useAuth` hook via `profileQuery`.
- For `userAuth` + `requiredProfile`: verifies profile exists
   - For `roleAuth`: resolves permissions via `resolveUserPermissions(profile.rolesIDs)`
   - Evaluates `PermissionFilter` (e.g., `user:read`)
4. **Backend**: Returns context to handler OR 401/403 error

### Database Layer
- **Drizzle ORM** → Type-safe SQL queries
- **Schema**: `user`, `session`, `account`, `verification` (auth) + `profile`, `role`, `comic`, `chapter`, `chapter_pages` (app)
- **Separation**: Auth data (`user`) vs business data (`profile`) with 1:1 link

### Type Safety Flow
TypeBox schemas → Drizzle schemas → Database tables
The `speard.ts` utility bridges Drizzle and TypeBox for API contract validation.

## Development Workflow

### Current State
- Basic project scaffolding in place with monorepo setup
- **Authentication system**: Fully implemented with Better-Auth
- **RBAC system**: Implemented with roles, permissions, and middleware
- **Profile management**: Full CRUD with auth requirements
- **Comic & Chapter Management**: Fully implemented CRUD operations.
  - Creation and editing of comics with thumbnail upload and metadata (categories, genres).
  - Creation and editing of chapters within comics.
  - Management dashboard with delete confirmation popups.
- **Landing page**: Public frontend displaying latest, recent, and recommended comics using React Query and the ComicCard component. Fetches data from three public backend endpoints (`/comics/latest-update`, `/comics/recently-added`, `/comics/recommended`). ComicCard links to the comic detail page.
- **Comic detail page**: Public page (`/comics/[comicId]`) showing comic info and chapter list. Authors see edit tools, chapter management (edit/delete), and add chapter button. Readers see read-only chapter list.
- **Chapter reading page**: Public page (`/comics/[comicId]/chapters/[chapterId]`) for reading comics with page-by-page navigation, chapter selector, and prev/next chapter buttons.
- **Type-safe API**: Eden treaty client + TypeBox schemas
- **Backend**: Elysia.js with OpenAPI/Swagger
- **Database**: Drizzle ORM with PostgreSQL (PGlite for dev)
- **UI/UX Redesign**: Completed Dracula-themed redesign with glassmorphism effects
  - Updated `globals.css` with Dracula color palette (purple #bd93f9, pink #ff79c6, cyan #8be9fd)  
  - Updated protected layout with modern header featuring gradient logo and user avatar
  - Redesigned dashboard with glassmorphism cards, hover effects, and improved typography
  - Refactored all protected pages (create/edit comics/chapters, onboarding) with consistent Dracula theme
  - Extracted ChapterList and ComicCard into reusable components
  - Enhanced InputField and AuthForm components with modern styling

### Missing Features
- **Search/Filters**: Comic discovery and filtering
- **Email verification**: Flow not yet wired up
- **Password reset**: Not implemented
- **Advanced RBAC UI**: Role editor, permission assignment interface
- **AI Worker System**: OCR and image inpainting processing for chapter pages

## Database Schema Consistency Issues & Fixes (2026-05-01)

### Parent Array Field Synchronization

The database schema uses array fields to maintain child entity references on parent records:
- `comic.chapter_ids` — array of chapter IDs belonging to a comic
- `chapter.page_ids` — array of chapter page IDs belonging to a chapter
- `chapter_pages.subtitle_ids` — array of subtitle IDs belonging to a page

**Problem**: Several CRUD operations on child entities did not update the corresponding parent array fields, causing data inconsistency. For example, deleting a chapter did not remove its ID from the parent comic's `chapter_ids` array.

**Root Cause**: The original implementation relied solely on database foreign keys with `ON DELETE CASCADE` for relational integrity, but the denormalized array fields were not kept in sync. This meant the array fields could become stale or incorrect after mutations.

**Fix Strategy**: All mutations now update parent array fields within database transactions, using PostgreSQL array functions:
- `array_append()` — add new child ID to parent array
- `array_remove()` — remove child ID from parent array
- `ARRAY[...]` — rebuild array in explicit order (for reorder operations)

**Affected Endpoints**:
- `DELETE /chapters/:id` — now removes chapter ID from `comic.chapter_ids`
- `POST /chapter-images/add` — now appends new page IDs to `chapter.page_ids`
- `DELETE /chapter-images/:id` — now removes page ID from `chapter.page_ids`
- `DELETE /chapter-images/batch/delete` — now rebuilds `chapter.page_ids` to reflect remaining pages
- `PATCH /chapter-images/batch/reorder` — now reorders `chapter.page_ids` to match the new page order
- `POST /chapter-images/add-queue/:id` — now appends new subtitle ID to `chapter_pages.subtitle_ids` when creating a subtitle

All operations maintain array consistency within transactions, ensuring parent references always match the actual child records.

### Technical Notes

- **ID Type Mismatch**: The schema defines `chapter_ids` and `page_ids` as `text[]` arrays, but foreign keys reference `serial` (integer) columns. Array operations handle implicit/explicit casting: `array_append()` implicitly casts integers to text; constructing new arrays with `ARRAY[...]` requires explicit cast to `text[]` to match column type. Consider normalizing to `integer[]` in a future migration.
- **Critical Bug Fixed**: The `POST /chapters/comic/:comicId` endpoint incorrectly used `WHERE id = newChapter[0].id` (the new chapter's ID) instead of `WHERE id = :comicId` when updating the parent comic's `chapter_ids`. This would have updated the wrong record or no record at all. Fixed to use the correct comic ID.
- **Reorder Implementation**: The reorder endpoint uses an in-memory array splice to compute final order, then re-indexes page numbers and updates the parent `page_ids` array in a single transaction.
- **Cascading Deletes**: Database-level `ON DELETE CASCADE` constraints still handle automatic child deletion; the array updates are additional denormalization maintenance.

## AI Worker Queue System

#### Database Schema
- **Table**: `worker_queue`
- **Fields**:
  - `id` (serial, PK)
  - `taskType` (enum: "page" | "chapter") — differentiates between page OCR/metadata tasks and chapter summary tasks.
  - `status` (enum: "claim", "pending", "failed", "completed")
  - `chapterId` (integer, nullable) — references `chapter.id`, used for chapter tasks.
  - `chapterPageId` (serial, not null) — references `chapter_pages.id`, used for page tasks.
  - `chapterPageSubtitlesId` (serial, not null) — references `chapter_page_subtitle.id`, used for page tasks.
  - `metadata` (jsonb) — stores processing options like `{ isInPaint: boolean }`
  - `stepStatus` (jsonb) — tracks processing steps like `{ ocr: boolean, metadataExtraction: boolean, chapterSummary?: boolean }`
  - `stepResult` (jsonb) — stores results like `{ ocr: any, metadataExtraction: any, chapterSummary?: any }`
  - `errorLog` (text) — error messages if processing fails
  - `createdAt`, `updatedAt` (timestamps)

#### Queue Management API
##### POST `/chapter-images/add-queue/:id` — Add Chapter Page to AI Processing Queue
- **Auth**: Required (`userAuth`)
- **Content-Type**: `application/json`
- **Description**: Adds a chapter page to the AI processing queue for OCR and optional inpainting. The system automatically creates a subtitle record if one doesn't exist, using the system user account. Handles different queue states:
  - **Pending**: Updates the existing task with new metadata
  - **Complete/Failed**: Creates a new task
  - **Claim** (processing): Returns 409 error
- **Request Body**:
  ```json
  {
    "inpaintImage": true
  }
  ```
- **Response**:
  - `200`: Task added/updated successfully, returns task object
  - `403`: Forbidden (user is not the chapter author)
  - `404`: Chapter page not found
  - `409`: Page is currently being processed
  - `500`: Internal server error

#### Processing Flow
1. **Queue Addition**: User adds page to queue via API
2. **Subtitle Creation**: System ensures `chapter_page_subtitle` exists (creates with system user if needed)
3. **Task Creation/Update**: Creates or updates `worker_queue` entry
4. **AI Worker Processing**: Background worker claims tasks and processes OCR/inpainting.
   - `backend/src/services/AiWorker.ts` currently runs OCR and metadata extraction on pending tasks.
   - **OCR Fallback**: The primary OCR model is `baidu/qianfan-ocr-fast:free`. If this fails, the system automatically falls back to `google/gemini-1.5-flash:free`.
   - **Type Safety**: The worker uses explicitly typed `ModelMessage[]` for AI requests to prevent TypeScript type widening (TS2345) when using intermediate request configurations.
   - The worker marks a task `claim` while processing, then `completed` when the metadata extraction is persisted.
5. **Result Storage**: Updates `chapter_page_subtitle` with extracted boxes, text, and page summary data.
   - `boxs` stores an array of OCR text blocks and bounding boxes.
   - `content` stores the combined extracted text for the page.
   - Summarization fields (`summary`, `characters`, etc.) store the page metadata.
    - **Chapter Summary Trigger**: After the task processing loop finishes, the worker evaluates the progress of all affected chapters. It collects all `chapterId`s from page tasks completed in the current cycle and runs the check once for each.
    - Wait condition: It waits until **every** task for the chapter's pages is finished running (no tasks are `pending` or `claimed`).
   - 90% Success Condition: If >= 90% of the pages have successfully completed their OCR and metadata extraction, a new task with `taskType = "chapter"` is added to the `worker_queue`.
   - Duplicate Prevention: The system only skips creating a new chapter task if an existing one is currently `pending` or `claimed`. If existing tasks are `completed` or `failed`, a new one will be created.
7. **Chapter Summary Task**: The worker processes chapter tasks by gathering all `chapterPageSubtitles` for the chapter.
   - It sends the chronological sequence of page summaries to `google/gemini-pro-1.5-exp:free` to generate a structured, coherent chapter narrative.
   - Results (`summary`, `major_events`, `themes`, `characters`, `emotional_arc`, `chapter_type`) are stored directly on the `chapters` table.

#### Files & Responsibilities
- **`backend/src/routes/chapterImage.ts`**: `POST /add-queue/:id` endpoint for queue management
- **`backend/src/services/AiWorker.ts`**: Background worker service for processing tasks
- **`backend/src/utils/system-user.ts`**: Provides system user for automated subtitle creation
- **`backend/src/database/schema/queue.ts`**: Queue table schema definition
- **`frontend/app/(protected)/comics/[comicId]/chapters/[chapterId]/edit/page.tsx`**: Chapter edit page with AI queue functionality. Each chapter page displays an "AI Process" button that adds the page to the processing queue. Shows loading states and tracks queued pages to prevent duplicate submissions.
- **`frontend/app/comics/[comicId]/chapters/[chapterId]/read/page.tsx`**: Public reader page featuring a responsive 3-column grid layout on large screens. The comic image is centered in the middle column (max-width 800px) with a seamless vertical flow (no gaps between pages). OCR text boxes alternate between the left and right side columns and are `sticky` during page scroll. AI Insights boxes (showing summary, emotions, action level, etc.) display on the opposite side of the OCR box. The page also features a "Chapter Insights" card showing the chapter-level summary, characters, and themes directly below the title. On mobile, both the OCR box and AI Insights stack below each image. Features a wider `1600px` container.

### Landing Page Future Enhancements
- Pagination / lazy loading for large comic collections
- Recommendation algorithm (currently uses latest updated comics)
- Filtering and sorting options (by category, genre, date, etc.)
- Infinite scroll for comic grids

## Comic Management API

### Chapter Page Management API
The chapter page management API handles operations for individual pages within chapters, including reordering pages.

#### PATCH `/chapter-images/batch/swap` — Swap Multiple Chapter Page Positions
- **Auth**: Required (`userAuth`)
- **Content-Type**: `application/json`
- **Description**: Swaps the positions of multiple chapter pages in a single operation. The API accepts an array of swap objects, each specifying a page ID and its new target position. After applying the requested swaps, the system re-indexes all pages in the chapter to ensure sequential ordering without gaps or duplicates.
- **Request Body**:
  ```json
  {
    "swaps": [
      {
        "pageId": 1,
        "newPosition": 3
      },
      {
        "pageId": 2,
        "newPosition": 1
      }
    ]
  }
  ```
- **Response**:
  - `200`: Returns the updated chapter page objects with their new positions
  - `400`: Invalid request (missing or invalid swap data)
  - `401`: Unauthorized
  - `403`: Forbidden (user is not the author or pages belong to different chapters)
  - `404`: Some pages not found
  - `500`: Internal server error

## Comic Management API

### Overview
Comics support full CRUD operations with thumbnail image upload via HackClub CDN. Each comic can have an optional thumbnail image stored as a URL. Metadata like categories and genres are supported as text arrays.

### Database Schema
- **Table**: `comic`
- **Fields**:
  - `id` (serial, PK)
  - `author_id` (text, not null) — links to `user` table
  - `title` (text, not null)
  - `description` (text, nullable)
  - `thumbnail` (text, nullable) — URL of the uploaded cover image
  - `categories` (text[], not null, default [])
  - `genres` (text[], not null, default [])
  - `chapter_ids` (text[], not null, default [])
  - `created_at`, `updated_at` (timestamps)

### Thumbnail Upload Flow
1. Client sends `multipart/form-data` with fields:
    - `title`, `description`, `categories` (array), `genres` (array), `thumbnail` (File)
2. Backend receives FormData, extracts file and fields.
3. Calls `uploadImages([file])` from `backend/src/utils/files.ts`
4. Stores returned URL in `thumbnail` column.

### Endpoints

#### POST `/comics/` — Create Comic
- **Auth**: Required (`userAuth`)
- **Content-Type**: `multipart/form-data`
- **Response**: 201 with full comic object.

#### PUT `/comics/:id` — Update Comic
- **Auth**: Required (owner only)
- **Content-Type**: `multipart/form-data`
- **Response**: 200 with updated comic object.

#### DELETE `/comics/:id` — Delete Comic
- **Auth**: Required (owner only)
- **Process**: Deletes thumbnail from CDN, then deletes comic record (cascades to chapters).

## Public Comic Reading

### Overview
The platform provides public-facing pages for browsing and reading comics without requiring authentication.

### Comic Detail Page (`/comics/[comicId]`)
- **Endpoint**: `GET /comics/:id` (public)
- **Features**:
  - Displays comic metadata: title, description, thumbnail, categories, genres
  - Lists all chapters sorted by index
  - **Author view** (if `comic.authorId === currentUser.id`):
    - Edit comic button linking to `/comics/[comicId]/edit`
    - Add Chapter button linking to `/comics/[comicId]/chapters/create`
    - Chapter list with edit/delete actions (uses `ChapterList` component)
  - **Reader view** (non-authors):
    - Chapter list with links to read each chapter
    - Shows page count per chapter
- **Data fetching**: Uses `api.api.comics({ id }).get()` with included chapters

### Chapter Reading Page (`/comics/[comicId]/chapters/[chapterId]/read`)
- **Endpoints used**:
  - `GET /chapters/:id` — fetch chapter with pages
  - `GET /chapters/comic/:comicId` — fetch all chapters for navigation
- **Features**:
  - Displays chapter title and comic title in sticky header
  - Renders all chapter pages as images in sequence
  - Navigation bar with:
    - Previous chapter button (disabled on first chapter)
    - Chapter selector dropdown (jump to any chapter)
    - Next chapter button (disabled on last chapter)
  - Sticky footer with navigation controls
- **Page layout**: Single-column reading flow with max-width container
- **Image handling**: Uses Next.js `Image` component with `priority` for first pages

## Comic API

### Cursor-Based Pagination (Keyset Pagination)
All cluster comic endpoints use efficient cursor-based pagination instead of `OFFSET`.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit`   | number | Items per page (default: `10`, min: `1`, max: `100`) |
| `cursor`  | string | Opaque base64-encoded cursor |

**Available Comic Endpoints**
| Endpoint | Order By Column | Notes |
|----------|----------------|-------|
| `GET /cluster/latest-update` | `updated_at DESC, id DESC` | Latest updated comics |
| `GET /cluster/recently-added` | `created_at DESC, id DESC` | Recently added comics |
| `GET /cluster/recommended` | `updated_at DESC, id DESC` | Placeholder |
| `GET /comics/latest-update` | `updated_at DESC` | Fetches all comics for dashboard |
| `GET /comics/recently-added` | `created_at DESC` | Recently added comics (no chapters included) |
| `GET /comics/recommended` | `updated_at DESC` | Recommended comics (currently same as latest-update) |
| `GET /comics/:id` | — | Fetches a single comic by ID (includes chapters) |

**Public endpoints** (no authentication required): `/comics/latest-update`, `/comics/recently-added`, `/comics/recommended`, `/comics/:id`, `/chapters/:id`, `/chapters/comic/:comicId`. Used by the landing page and comic reading pages.

## Authentication System

### Overview
The authentication system uses **Better-Auth** for session management, backed by a PostgreSQL database with Drizzle ORM.

### Architecture

#### Database Layer
- `user`, `session`, `account`, `verification`, `profile`, `role` tables.

#### Backend - Better-Auth Configuration
- `backend/src/libs/auth.config.ts`

#### Frontend - Auth Client
- `frontend/lib/auth.ts`

#### Auth Hook (Frontend)
- `frontend/hooks/useAuth.ts`

## Recent Refactorings

### Layout & Navigation Component Extraction (2026-05-01)

Extracted repeated navbar and layout header code into reusable components to improve maintainability and consistency across the application.

**New Components Created:**

- **`frontend/components/Navbar.tsx`** - Main navigation bar component with two variants:
  - `public`: For unauthenticated pages (landing page, login, register). Shows gradient logo, "Sign in" link, and "Get Started" button.
  - `protected`: For authenticated area (dashboard, create/edit pages). Shows logo, user greeting ("Hello, {name}"), and "Sign out" button with loading state.
  - Uses `useAuth()` hook for session state and sign-out functionality.

- **`frontend/components/ReaderHeader.tsx`** - Comic reader page header with chapter navigation. Includes:
  - Top sticky header with comic title breadcrumb and current chapter info
  - Bottom sticky navigation bar with previous/next chapter buttons and chapter selector dropdown
  - Properly handles chapter ordering by index and disables buttons at boundaries

**Files Refactored:**

1. `frontend/app/(protected)/layout.tsx` - Replaced inline header with `<Navbar variant="protected" />`. Removed direct `Link` import; kept `useAuth`, `useEffect`, `usePathname`, `useRouter` imports.

2. `frontend/app/page.tsx` (landing page) - Replaced inline header with `<Navbar variant="public" />`.

3. `frontend/app/comics/[comicId]/chapters/[chapterId]/read/page.tsx` - Replaced inline header and bottom navigation with `<ReaderHeader />`. Removed duplicate chapter navigation logic (prev/next chapter calculation, chapter selector) which is now handled by the component. Cleaned up unused variables (`currentIndex`, `prevChapter`, `nextChapter`) and router usage for chapter selection (now uses `window.location.href`). Added `ReaderHeader` import and mapped chapter data to prop format.

**Design Consistency:**

- All navbar variants maintain Dracula theme styling (`bg-background/80`, `backdrop-blur-sm`, `border-border`).
- Gradient logo (`from-primary to-accent`) used consistently in both variants.
- Smooth transitions and glassmorphism effects preserved.
- Mobile menu button placeholder retained in Navbar for future expansion.

**Type Safety Improvements:**

- `ReaderHeader` defines `ChapterInfo` interface for chapter data (`id`, `index`, `title`).
- Removed `any` types from chapter mapping in read page.
- Props typed explicitly with non-null assumptions after data loading checks.

**Notes:**

- Navbar component internally uses `useAuth()`; no need to pass auth state as props.
- ReaderHeader handles its own sorting of chapters by index.
- Chapter selector in ReaderHeader uses direct `window.location.href` instead of `router.push` to avoid Next.js navigation constraints within client components.

**Future Work:**

- Implement mobile menu dropdown in Navbar.
- Consider extracting a `Breadcrumb` component if more complex breadcrumb navigation is needed elsewhere.
- Add skeleton loading states for ReaderHeader while chapter data loads (currently parent handles loading state).

### Comics Section Layout (2026-05-01)

Created a layout wrapper for the `/comics` route section to provide consistent navigation structure.

**New Layout:**

- **`frontend/app/comics/layout.tsx`** - Client-side layout wrapper that:
  - Renders a persistent top navigation bar with a "Back to Home" breadcrumb link
  - Provides a `flex-1` main content area for child routes
  - Uses subtle styling (`bg-muted/10`, `border-border/30`) to differentiate the comics section
  - Does not impose width constraints—child pages handle their own container styling
  - Wraps both `/[comicId]` (comic detail) and `/[comicId]/chapters/[chapterId]/read` (reader) pages

**Design Rationale:**

- The comic detail page already uses a `max-w-6xl` container with internal padding and spacing
- The reader page already includes `ReaderHeader` and its own full-screen layout structure
- The layout adds minimal overhead—just a back navigation and semantic `<main>` wrapper
- Back link uses consistent icon and hover styles matching the Dracula theme

**Child Pages Affected:**

1. `frontend/app/comics/[comicId]/page.tsx` - Now rendered inside the comics layout with a back-to-home link above the comic detail card
2. `frontend/app/comics/[comicId]/chapters/[chapterId]/read/page.tsx` - Now rendered inside the comics layout with back-to-home link above the reader header

- **Note on File Path Correction**:
- Previously the PROJECT_DESCRIPTION listed the reading page as `chapters/[chapterId]/page.tsx`; it has been corrected to `chapters/[chapterId]/read/page.tsx` throughout the documentation.

### Logging Cleanup (2026-05-02)

Improved the logging quality in the AI Worker service by removing unnecessary debug output and integrating the standard Pino logger.

- **`backend/src/services/AiWorker.ts`**:
    - Replaced `console.log` and `console.error` with the `logger` utility.
    - Removed verbose debug logs that printed entire database objects (tasks, chapters).
    - Standardized lifecycle and error logging.
    - Added structured logging for task processing and chapter completion checks.

## Recent Fixes (2026-05-02)

### AI Message Type Widening Fix

Fixed a critical TypeScript error in the AI worker service where messages were losing their literal types.

- **Issue**: Intermediate request configurations caused role strings to widen to `string`.
- **Fix**: Explicitly typed messages as `ModelMessage[]` and updated imports from `ai` package.
- **Verification**: Backend typecheck now passes successfully.