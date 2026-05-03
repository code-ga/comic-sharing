# Comic Sharing Platform

A full-stack comic sharing platform built as a monorepo with TypeScript, using Bun.js as the runtime. The project consists of a Next.js frontend and an Elysia.js backend with PostgreSQL database (Drizzle ORM).

## 🚀 Features

- **Comic Management**: Full CRUD operations for comics with thumbnail upload via HackClub CDN
- **Chapter Management**: Create, edit, delete, and reorder chapters within comics
- **Chapter Pages**: Upload and manage individual comic pages with OCR capabilities
- **AI Processing**: Automated OCR and metadata extraction for chapter pages using multiple AI models
- **User Authentication**: Built-in auth with Better-Auth (email/password, Google, GitHub, Discord)
- **Role-Based Access Control (RBAC)**: Comprehensive permission system with roles and user management
- **Public Reading**: Public-facing comic detail and chapter reading pages
- **Type-Safe API**: Eden treaty client with TypeBox schemas for compile-time type safety
- **Modern UI**: Dracula-themed design with glassmorphism effects and smooth animations

## 🏗️ Architecture

### Monorepo Structure

- **Root**: Bun workspace configuration managing shared dependencies
- **Frontend**: Next.js 16 application (`@comic-sharing/frontend`) with API route proxy at `/api/*`
- **Backend**: Elysia.js API server (`@comic-sharing/backend`)

### Request Flow

1. **Client → Frontend**: Same-origin requests to `/api/*` → Next.js API route
2. **Frontend Proxy**: Forwards requests to `BACKEND_TARGET_URL` (server-side only)
3. **Backend → Database**: Elysia routes handle business logic and Drizzle queries
4. **Response**: Flows back through proxy to client

This proxy architecture hides the actual backend host from the browser, allows changing backend URL via environment variables, and avoids CORS complications.

## 📁 Project Structure

```
comic-sharing/
├── package.json              # Bun workspace configuration
├── docker-compose.yaml       # Multi-container setup (PostgreSQL, Backend, Frontend)
├── .env.example             # Environment variables template
├── biome.json               # Code formatting/linting configuration
├── backend/                 # Elysia.js backend
│   ├── src/
│   │   ├── index.ts         # Elysia app setup
│   │   ├── routes/          # API routes (comic, chapters, auth, etc.)
│   │   ├── services/        # Business logic (AiWorker, etc.)
│   │   ├── utils/           # Utilities (logger, system-user, files)
│   │   ├── types/           # Shared API response types
│   │   └── database/        # Drizzle ORM schemas
│   └── drizzle.config.ts    # Drizzle Kit configuration
└── frontend/                # Next.js 16 frontend
    ├── app/
    │   ├── (protected)/     # Authenticated routes
    │   ├── api/             # API proxy routes
    │   ├── comics/          # Comic-related pages
    │   └── login/           # Authentication pages
    ├── components/          # Reusable components
    ├── lib/                 # API clients and utilities
    ├── hooks/               # Custom React hooks
    └── globals.css          # Global styles with Dracula theme
```

## 🎨 UI/UX Design

### Design System

- **Theme**: Dracula color palette
  - Purple: `#bd93f9`
  - Pink: `#ff79c6`
  - Cyan: `#8be9fd`
- **Styling**: Tailwind CSS v4 with PostCSS
- **Dark Mode**: Automatic via `prefers-color-scheme`
- **Effects**: Glassmorphism, smooth rounded corners, subtle shadows
- **Typography**: Geist font family

### Components

- **Navbar**: Reusable navigation with public and protected variants
- **ComicCard**: Responsive comic display with hover effects
- **ChapterList**: Editable chapter list with actions
- **ReaderHeader**: Comic reader navigation with chapter selector
- **AuthForm**: Reusable authentication form with theme integration

## 🔐 Authentication System

### Better-Auth Integration

The authentication system uses **Better-Auth** for comprehensive session management:

- ✅ Email/Password authentication
- ✅ OAuth providers (Google, GitHub, Discord)
- ✅ Session management with cookies
- ✅ Email verification (wired up)
- ✅ Password reset support

### Profile & Authorization

- **Separation of Concerns**: Auth data (`user`) vs business data (`profile`) with 1:1 link
- **RBAC System**: Roles and permissions with middleware protection
- **System User**: Automated actions use a dedicated system account to avoid constraint errors

## 🗄️ Database Schema

### Tables

- **Auth**: `user`, `session`, `account`, `verification` (Better-Auth)
- **Business**: `profile`, `role`, `permission`, `user_role`
- **Comics**: `comic`, `chapter`, `chapter_pages`, `chapter_page_subtitle`
- **AI**: `worker_queue` (OCR processing queue)

### Key Features

- **Drizzle ORM**: Type-safe SQL queries
- **Array Fields**: Denormalized child references (`chapter_ids`, `page_ids`)
- **Transactions**: All mutations update parent arrays atomically
- **Foreign Keys**: Database-level cascading deletes with array maintenance

## 🤖 AI Worker Queue System

### Processing Pipeline

1. **Queue Addition**: User adds page to processing queue via API
2. **Subtitle Creation**: System ensures subtitle record exists (creates with system user)
3. **Task Management**: Creates or updates `worker_queue` entry
4. **AI Processing**: Background worker claims tasks and processes OCR/inpainting
   - Primary OCR: Baidu Qianfan (free tier)
   - Fallback OCR: Google Gemini 1.5 Flash (free tier)
5. **Result Storage**: Updates subtitle with extracted text, boxes, and metadata
6. **Chapter Summary**: When 90%+ pages complete, generates chapter-level narrative

### API Endpoints

- `POST /chapter-images/add-queue/:id` - Add page to AI processing queue
- `POST /chapter-images/add` - Add new chapter page
- `DELETE /chapter-images/:id` - Delete chapter page
- `PATCH /chapter-images/batch/reorder` - Reorder pages in chapter
- `PATCH /chapter-images/batch/swap` - Swap multiple page positions

## 🎬 Comic Management API

### Endpoints

#### Comics
- `POST /comics/` - Create comic (multipart/form-data)
- `PUT /comics/:id` - Update comic
- `DELETE /comics/:id` - Delete comic
- `GET /comics/:id` - Get single comic

#### Public Endpoints (No Auth Required)
- `GET /comics/latest-update` - Latest updated comics
- `GET /comics/recently-added` - Recently added comics
- `GET /comics/recommended` - Recommended comics
- `GET /comics/:id` - Comic detail page
- `GET /chapters/:id` - Chapter detail
- `GET /chapters/comic/:comicId` - All chapters for a comic

### Cursor-Based Pagination

All cluster comic endpoints use efficient cursor-based pagination:

```typescript
// Query Parameters
limit: number  // Items per page (default: 10, max: 100)
cursor: string // Base64-encoded cursor
```

## 🛠️ Development

### Prerequisites

- [Bun](https://bun.sh) - JavaScript runtime
- [PostgreSQL](https://www.postgresql.org/) - Database (or use Docker)
- [Node.js](https://nodejs.org/) - For development tools

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/comic-sharing.git
cd comic-sharing

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
```

### Environment Variables

```env
# Backend
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/comic_sharing"

# Frontend (Server-side only)
BACKEND_TARGET_URL="http://localhost:3001"

# Drizzle Studio (Optional)
MASTERPASS="your-secure-masterpass"
```

### Running the Application

#### Option 1: Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Option 2: Local Development

```bash
# Terminal 1: Start PostgreSQL (if not using Docker)
# Install and start PostgreSQL on port 5432

# Terminal 2: Start Backend
cd backend
bun run dev

# Terminal 3: Start Frontend
cd frontend
bun run dev
```

### Database Migrations

```bash
# Generate migration
cd backend
bun run drizzle-kit generate

# Run migrations
bun run drizzle-kit migrate

# Push schema (for development)
bun run drizzle-kit push
```

### Available Scripts

```bash
# Root
bun run dev          # Start all services
bun run build        # Build all packages
bun run lint         # Lint all packages
bun run typecheck    # Type check all packages

# Backend
cd backend
bun run dev          # Start development server
bun run build        # Build for production
bun run start        # Start production server
bun run db:push      # Push schema to database
bun run db:studio    # Open Drizzle Studio

# Frontend
cd frontend
bun run dev          # Start development server
bun run build        # Build for production
bun run start        # Start production server
bun run lint         # Lint code
```

## 📖 API Documentation

### OpenAPI/Swagger

The backend provides OpenAPI documentation. When running locally:

- **Swagger UI**: http://localhost:3001/docs

### Drizzle Studio

Database GUI for development:

- **URL**: http://localhost:3001/db/studio
- **Gateway Masterpass**: Check your `.env` file

## 🔍 Type Safety

The project uses a sophisticated type system:

1. **TypeBox Schemas**: Define API contracts
2. **Drizzle Schemas**: Define database structure
3. **Eden Treaty**: Type-safe API client
4. **Automatic Validation**: Schemas validated at runtime

### Type Flow

```
TypeBox Schemas → Drizzle Schemas → Database Tables
         ↓
    Runtime Validation
         ↓
    Frontend Types (Eden Treaty)
```

## 🎯 Project Status

### ✅ Implemented Features

- [x] Authentication system with Better-Auth
- [x] RBAC system with roles and permissions
- [x] Profile management
- [x] Comic CRUD operations
- [x] Chapter CRUD operations
- [x] Chapter page management
- [x] Thumbnail upload
- [x] Public comic reading pages
- [x] AI worker queue system
- [x] OCR processing with fallback
- [x] Chapter summary generation
- [x] Dracula-themed UI redesign
- [x] Glassmorphism effects
- [x] Reusable components (Navbar, ComicCard, etc.)
- [x] Type-safe API with Eden Treaty
- [x] Cursor-based pagination
- [x] Array field synchronization

### 🚧 Missing Features

- [ ] Search and filter functionality
- [ ] Email verification flow (wired up but not fully tested)
- [ ] Password reset implementation
- [ ] Advanced RBAC UI (role editor, permission assignment)
- [ ] AI worker system enhancements
- [ ] Pagination for landing page
- [ ] Recommendation algorithm
- [ ] Infinite scroll for comic grids

## 🎨 Design Decisions

### Why Dracula Theme?

- Professional dark theme for content creators
- High contrast for readability
- Popular among developer tools
- Easy to customize

### Why Elysia.js?

- Excellent TypeScript support
- Plugin ecosystem
- Performance
- Built-in OpenAPI generation

### Why Next.js?

- Server-side rendering for SEO
- App Router for modern architecture
- Built-in API routes for proxying
- Excellent developer experience

### Why Drizzle ORM?

- Type safety at database level
- No code generation needed
- Works seamlessly with TypeScript
- Excellent PostgreSQL support

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use Bun for package management
- Follow existing code patterns
- Add TypeScript types for all new code
- Write tests for new features
- Update PROJECT_DESCRIPTION.md for significant changes
- Use tabs for indentation, double quotes for strings

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Better-Auth](https://better-auth.com/) - Authentication
- [Elysia.js](https://elysiajs.com/) - Backend framework
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [TypeBox](https://github.com/sinclairzx81/typebox) - Runtime types
- [Eden Treaty](https://elysiajs.com/plugins/eden) - Type-safe API client

## 📞 Support

For issues, questions, or suggestions, please [open an issue](https://github.com/your-org/comic-sharing/issues) on GitHub.

---

**Built with ❤️ for comic creators everywhere**