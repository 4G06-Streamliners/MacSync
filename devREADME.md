# Team D - Development Guide

## Overview

Team D is part of the MacEngSociety Large Event Platform, developing features for event management using a modern web stack. This guide covers the architecture, development workflow, and best practices for Team D developers.

**Current Stack:**
- **Frontend:** React 19 + Vite 5.4.8 + TanStack Router 1.58.3
- **Backend:** Fastify 5.2.0
- **Styling:** Tailwind CSS 3.4.0 + Styled Components
- **Database:** PostgreSQL + Drizzle ORM
- **TypeScript:** 5.4.5
- **Package Manager:** pnpm 8.15.0+

---

## Architecture

### 🎯 Consolidated API Architecture

Team D uses a **single consolidated API** serving all clients:
- **API Server** (Port 3004) - Fastify backend with real database
- **Web User** (Port 3014) - React client-only app
- **Web Admin** (Port 3024) - React client-only app
- **Mobile** (Future) - Will consume same API

**Key Benefits:**
✅ Single source of truth for business logic
✅ Real database integration via `@large-event/api`
✅ Role-based access control (RBAC)
✅ Proper CORS for all clients
✅ Simpler client builds (no embedded servers)

### Directory Structure

```
teams/teamD/
├── teamd.config.ts       # ⭐ CENTRALIZED CONFIG (all ports & URLs)
│
├── src/
│   ├── api/              # 🆕 Consolidated API Server (Port 3004)
│   │   ├── src/
│   │   │   ├── index.ts         # Main Fastify server
│   │   │   ├── config/
│   │   │   │   └── cors.ts      # CORS (imports from teamd.config.ts)
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts      # Authentication endpoints
│   │   │   │   ├── users.ts     # User management (admin)
│   │   │   │   └── health.ts    # Health checks
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts      # JWT verification
│   │   │   │   └── rbac.ts      # Role-based access
│   │   │   └── utils/
│   │   │       └── response.ts  # Standardized responses
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   ├── database/         # Team-specific database overlays
│   │   ├── src/
│   │   │   ├── overlays/      # Team schemas
│   │   │   ├── migrations/    # Team migrations
│   │   │   └── scripts/       # Schema promotion tools
│   │   └── drizzle/           # Generated migrations
│   │
│   ├── mobile/           # Empty - Placeholder for React Native
│   ├── shared/           # Empty - Placeholder for shared utilities
│   │
│   ├── web-user/         # 🎨 User Portal (Port 3014)
│   │   ├── src/
│   │   │   ├── routes/        # TanStack Router routes
│   │   │   │   ├── __root.tsx   # Root layout + AuthProvider
│   │   │   │   ├── index.tsx    # Home page
│   │   │   │   └── login.tsx    # Login page
│   │   │   ├── components/    # React components
│   │   │   ├── contexts/      # React contexts (AuthContext)
│   │   │   └── lib/           # Utilities
│   │   ├── index.html
│   │   ├── vite.config.ts     # Proxies /api → localhost:3004
│   │   └── package.json
│   │
│   └── web-admin/        # 🔧 Admin Portal (Port 3024)
│       ├── src/
│       │   ├── routes/        # TanStack Router routes
│       │   │   ├── __root.tsx   # Root layout + AuthProvider
│       │   │   └── index.tsx    # Dashboard
│       │   ├── components/    # React components
│       │   └── lib/           # Utilities
│       ├── index.html
│       ├── vite.config.ts     # Proxies /api → localhost:3004
│       └── package.json
│
├── docs/                 # Project documentation
├── test/                 # Test cases
├── refs/                 # Reference materials
├── pnpm-workspace.yaml   # pnpm workspace config
├── package.json          # Root workspace with dev scripts
└── README.md            # Project overview
```

---

## Development Modes

### 1. Integrated Mode (Production)
Access Team D features through the main platform:
- **User Portal:** `http://localhost/teams/teamD/user/`
- **Admin Portal:** `http://localhost/teams/teamD/admin/`
- Features embedded via iframes in main portal

### 2. Standalone Mode (Development)
Direct access to Team D applications:
- **User Portal:** `http://localhost:3014/`
- **Admin Portal:** `http://localhost:3024/`
- Independent development and testing

---

## Getting Started

### Prerequisites
- **Node.js:** >= 18.0.0
- **pnpm:** >= 8.15.0
- **PostgreSQL:** 15+ (via Docker or local)
- **Git:** Latest version

### Initial Setup

```bash
# Navigate to Team D directory
cd teams/teamD

# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

### Development Commands

#### Root Level (All Services)
```bash
pnpm dev              # Run API + web-user + web-admin (all 3 services)
pnpm build            # Build all applications
pnpm clean            # Clean all build artifacts
```

#### Individual Services
```bash
# Consolidated API
pnpm dev:api          # Start API server (port 3004)
pnpm build:api        # Build API

# Web User Portal
pnpm dev:user         # Start user portal (port 3014)
pnpm build:user       # Build user portal

# Web Admin Portal
pnpm dev:admin        # Start admin portal (port 3024)
pnpm build:admin      # Build admin portal
```

#### Database Operations
```bash
# Shared database (requires @large-event/database)
pnpm db:generate      # Generate migrations from schema
pnpm db:migrate       # Apply migrations
pnpm db:push          # Push schema directly (dev only)
pnpm db:studio        # Open Drizzle Studio

# Team D database overlays
pnpm teamd:db:generate   # Generate team migrations
pnpm teamd:db:migrate    # Apply team migrations
pnpm teamd:db:promote    # Promote schemas to shared layer
```

---

## ⚙️ Centralized Configuration

**All ports, URLs, and network configuration are centralized in [`teamd.config.ts`](teamd.config.ts).**

This is the **single source of truth** for all network-related configuration. Update ports and URLs here to apply changes across all services.

### Configuration File Structure

```typescript
// teamd.config.ts
export const TeamDConfig = {
  api: {
    port: 3004,
    url: { local: 'http://localhost:3004', docker: 'http://team-d-api:3004' }
  },
  webUser: {
    port: 3014,
    url: { local: 'http://localhost:3014', docker: 'http://team-d-web-user:3014' }
  },
  webAdmin: {
    port: 3024,
    url: { local: 'http://localhost:3024', docker: 'http://team-d-web-admin:3024' }
  },
  cors: {
    allowedOrigins: [...] // All allowed CORS origins
  },
  infrastructure: {
    postgres: { ... },
    redis: { ... }
  }
}
```

### How It Works

**API Server** (`src/api/src/index.ts`):
```typescript
import TeamDConfig from '../../../teamd.config.js'

const PORT = parseInt(process.env.PORT || String(TeamDConfig.api.port))
const HOST = process.env.HOST || TeamDConfig.api.host
```

**CORS Config** (`src/api/src/config/cors.ts`):
```typescript
import TeamDConfig from '../../../../teamd.config.js'

export const corsOrigins = TeamDConfig.cors.allowedOrigins
```

**Vite Configs** (`src/web-user/vite.config.ts`, `src/web-admin/vite.config.ts`):
```typescript
import TeamDConfig from '../../teamd.config'

export default defineConfig({
  server: {
    port: TeamDConfig.webUser.port,  // or TeamDConfig.webAdmin.port
    proxy: {
      '/api': {
        target: TeamDConfig.api.url.local,
        changeOrigin: true,
      },
    },
  },
})
```

### Changing Ports or URLs

**To change a port:**
1. Open `teamd.config.ts`
2. Update the desired port (e.g., `api.port: 3004` → `api.port: 4000`)
3. Restart services (`pnpm dev`)
4. **That's it!** All services automatically use the new port.

**To add a new CORS origin:**
1. Open `teamd.config.ts`
2. Add to `cors.allowedOrigins` array
3. Restart API (`pnpm dev:api`)

**Environment Variables:**
Environment variables still override config values:
```bash
PORT=5000 pnpm dev:api  # API runs on port 5000 instead of 3004
```

### Benefits

✅ **Single source of truth** - No more hunting for hardcoded ports
✅ **Easy updates** - Change once, applies everywhere
✅ **Type-safe** - TypeScript ensures correct usage
✅ **Environment-aware** - Separate local/Docker URLs
✅ **Self-documenting** - All network config in one place

---

## 📦 Private Package Registry Setup

Team D uses a **hybrid registry approach** for `@large-event` shared packages, allowing development both inside and outside the monorepo.

### Architecture

```
Development Context          Package Resolution
─────────────────────────────────────────────────────
Inside Monorepo     ──→   Workspace Linking (fast)
                               ↓ (if unavailable)
Outside Monorepo    ──→   GitHub Packages (fallback)
                          OR
Local Development   ──→   Verdaccio (local registry)
```

### Available Registries

#### 1. **Workspace Linking** (Primary - Inside Monorepo)
When developing inside the main monorepo, pnpm automatically links `@large-event` packages from `shared/`:

```bash
# These are symlinked automatically
@large-event/database  → ../../../../../../shared/database
@large-event/api       → ../../../../../../shared/api
@large-event/api-types → ../../../../../../shared/api-types
```

**Configuration:** Already set via `prefer-workspace-packages=true` in `.npmrc`

#### 2. **GitHub Packages** (Fallback - Outside Monorepo)
When Team D repo is cloned independently (outside monorepo), packages fallback to GitHub Packages.

**Setup:**
1. Create GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Generate new token (classic)
   - Select scopes: `read:packages`, `write:packages` (if publishing)
   - Copy the token (starts with `ghp_`)

2. Set environment variable:
   ```bash
   # Add to ~/.zshrc or ~/.bashrc
   export LARGE_EVENTS_GITHUB_TOKEN=ghp_your_token_here
   ```

3. Or add to your user `.npmrc`:
   ```bash
   # ~/.npmrc
   //npm.pkg.github.com/:_authToken=ghp_your_token_here
   ```

**Install packages:**
```bash
cd teams/teamD
pnpm install  # Automatically uses GitHub Packages for @large-event packages
```

#### 3. **Verdaccio** (Local Development - Optional)
For offline development or faster local package resolution, use Verdaccio.

**Start Verdaccio:**
```bash
# From monorepo root
docker-compose up -d verdaccio

# Verdaccio UI available at: http://localhost:4873
```

**Publish packages to Verdaccio:**
```bash
# From monorepo root
./scripts/publish-to-verdaccio.sh
```

**Use Verdaccio (instead of GitHub Packages):**
Edit `teams/teamD/.npmrc` and uncomment:
```
# @large-event:registry=http://localhost:4873
```

Comment out GitHub Packages line:
```
# @large-event:registry=https://npm.pkg.github.com
```

### Package Configuration

Team D API `package.json` uses **semver ranges** (not `workspace:*`):
```json
{
  "dependencies": {
    "@large-event/api": "^1.0.0",
    "@large-event/database": "^1.0.0"
  }
}
```

This allows pnpm to:
1. **First** try workspace linking (if inside monorepo)
2. **Then** fallback to configured registry (if outside monorepo)

### Publishing Packages

#### Automatic (GitHub Actions)
Packages are automatically published to GitHub Packages when changes are pushed to `main` branch:

```yaml
# Workflow: .github/workflows/publish-packages.yml
on:
  push:
    branches: [main]
    paths: ['shared/**']
```

#### Manual (Verdaccio)
For local testing:
```bash
# From monorepo root
./scripts/publish-to-verdaccio.sh
```

### Troubleshooting

**Problem:** `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`
**Solution:** Install from monorepo root first:
```bash
cd /path/to/large-event  # Monorepo root
pnpm install
```

**Problem:** Verdaccio connection refused
**Solution:** Start Verdaccio:
```bash
docker-compose up -d verdaccio
```

**Problem:** GitHub Packages 401 Unauthorized
**Solution:** Check LARGE_EVENTS_GITHUB_TOKEN is set:
```bash
echo $LARGE_EVENTS_GITHUB_TOKEN  # Should output your token
```

### Benefits

✅ **Flexible** - Works inside and outside monorepo
✅ **Fast** - Workspace linking when available
✅ **Offline-capable** - Verdaccio for local development
✅ **CI/CD ready** - Automatic publishing via GitHub Actions
✅ **Free** - No cost for private packages (GitHub free tier)

---

## Tech Stack Details

### Frontend Architecture

#### React 19 + Vite
- **Build Tool:** Vite 5.4.8 with HMR (Hot Module Replacement)
- **Dev Server:** Runs on ports 3014 (user) and 3024 (admin)
- **Build Output:** `dist/client/` directory
- **Proxy:** API requests (`/api/*`) proxied to Fastify backend

#### TanStack Router
- **Version:** 1.58.3
- **Pattern:** File-based routing in `src/routes/`
- **Features:** Type-safe navigation, auto-generated route tree
- **DevTools:** Available in development mode

**Route Files:**
```typescript
// src/routes/__root.tsx - Root layout
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { AuthProvider } from '@/contexts/AuthContext'

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  ),
})

// src/routes/index.tsx - Home page
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

// src/routes/login.tsx - Login page
export const Route = createFileRoute('/login')({
  component: LoginComponent,
})
```

**Auto-generated Route Tree:**
- File: `src/routeTree.gen.ts`
- Generated by: `@tanstack/router-vite-plugin`
- **Do not edit manually!**

#### Styling
**Tailwind CSS 3.4.0:**
- Utility-first CSS framework
- Configuration: `tailwind.config.js`
- PostCSS setup: `postcss.config.js`
- Global styles: `src/index.css`

**Styled Components 6.1.19 (web-user only):**
- CSS-in-JS for component-specific styles
- Theme support via `ThemeProvider`
- Used alongside Tailwind for complex components

### Backend Architecture

#### Fastify 5.2.0
**Server Ports:**
- Web User API: `http://localhost:3114`
- Web Admin API: `http://localhost:3124`

**Server Location:** `src/server/index.ts` in each app

**Example Server Setup:**
```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'

const fastify = Fastify({ logger: true })

// Plugins
await fastify.register(cors, {
  origin: 'http://localhost:3014',
  credentials: true,
})

await fastify.register(cookie)

// Routes
fastify.post('/api/auth/login', async (request, reply) => {
  // Login logic
})

fastify.get('/api/auth/me', { preHandler: [authMiddleware] }, async (request, reply) => {
  // Get current user
})

// Start server
await fastify.listen({ port: 3114, host: '0.0.0.0' })
```

#### API Endpoints

**Web User API (Port 3114):**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | Local login | No |
| POST | `/api/auth/logout` | Logout & clear cookies | No |
| GET | `/api/auth/me` | Get current user | Yes |
| GET | `/api/auth/token` | Get auth token | Yes |

**Web Admin API (Port 3124):**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/health` | Health check | No |
| POST | `/api/auth/local-login` | Local admin login | No |

#### Authentication System

**JWT-based Authentication:**
- Library: `jsonwebtoken 9.0.2`
- Token expiry: 24 hours
- Storage: HTTP-only cookies + sessionStorage
- Secret: Environment variable or fallback

**Dual Authentication Support:**
1. **Local Authentication:** Team D-specific users (testing)
2. **Main Portal Authentication:** Via URL token (production)

**Mock Users (Development):**
```typescript
const mockUsers = [
  { id: 1, email: 'user@teamd.local', password: 'password123' },
  { id: 2, email: 'test@teamd.dev', password: 'test123' },
  { id: 3, email: 'demo@teamd.local', password: 'demo123' },
]
```

**Auth Context:**
```typescript
// src/contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

export function useAuth() {
  return useContext(AuthContext)
}
```

### Database Layer

#### Team Database Package
**Package:** `@teamd/database`
**Location:** `src/database/`

**Purpose:** Team-specific database schemas and overlays

**Structure:**
```
src/database/
├── src/
│   ├── index.ts              # Main exports
│   ├── migrate.ts            # Migration runner
│   ├── overlays/             # Team-specific schemas
│   │   ├── extensions.ts       # Database extensions
│   │   ├── team-specific-tables.ts  # Team tables
│   │   └── index.ts
│   └── scripts/
│       └── promote-schema.js   # Schema promotion to shared layer
└── drizzle/                  # Generated migrations
    └── meta/
```

#### Database Workflow

**1. Create Team Schema:**
```typescript
// src/database/src/overlays/events.ts
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const teamDEvents = pgTable('teamd_events', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
})
```

**2. Generate Migration:**
```bash
pnpm teamd:db:generate
# Prompts: "What did you change?"
# Output: drizzle/<timestamp>_<description>.sql
```

**3. Apply Migration:**
```bash
pnpm teamd:db:migrate
# Applies pending migrations to database
```

**4. Test & Verify:**
```bash
pnpm teamd:db:studio
# Opens Drizzle Studio on http://localhost:4983
```

**5. Promote to Shared Layer (when stable):**
```bash
pnpm teamd:db:promote
# Copies schema to shared/database/src/schemas/
# Coordinate with platform team for merge
```

#### Database Configuration
```typescript
// drizzle.config.ts
export default {
  schema: './src/overlays/index.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL ||
                     'postgresql://postgres:postgres@localhost:5432/large_event',
  },
}
```

---

## Development Workflow

### Concurrent Dev Mode

Each application runs **two processes concurrently**:

**Web User Example:**
```json
{
  "scripts": {
    "dev": "concurrently \"pnpm dev:client\" \"pnpm dev:server\"",
    "dev:client": "vite",
    "dev:server": "tsx watch src/server/index.ts"
  }
}
```

**Process 1 - Vite Client (Port 3014):**
- React app with HMR
- Auto-reloads on file changes
- TanStack Router DevTools enabled

**Process 2 - Fastify Server (Port 3114):**
- API backend with `tsx watch`
- Auto-restarts on file changes
- API requests proxied from client

### Hot Module Replacement (HMR)

Vite provides instant HMR for:
- ✅ React components
- ✅ CSS/Tailwind changes
- ✅ Route file updates
- ✅ Context/hook changes

Server changes require restart (handled by `tsx watch`).

### Type Safety

**TypeScript Configuration:**
```json
{
  "compilerOptions": {
    "strict": false,
    "strictNullChecks": true,  // Required by TanStack Router
    "noEmit": true,            // Vite handles bundling
    "paths": {
      "@/*": ["./src/*"]       // Path alias
    }
  },
  "include": ["src"],          // Only compile src/
  "exclude": ["node_modules", "dist"]
}
```

**Important:**
- `strictNullChecks` is **required** by TanStack Router
- `noEmit` set because Vite handles compilation
- Separate `tsconfig.server.json` for server builds

### Build Process

**Development Build:**
```bash
pnpm dev
# Runs both client and server in watch mode
```

**Production Build:**
```bash
pnpm build
# 1. Runs TypeScript compiler (tsc) - type checking only
# 2. Runs Vite build - bundles client code
# Output: dist/client/
```

**Build Output:**
```
dist/client/
├── index.html
├── assets/
│   ├── index-[hash].css   # Bundled styles
│   └── index-[hash].js    # Bundled JavaScript
└── ...
```

**Server Build:**
```bash
pnpm build:server
# Uses tsconfig.server.json
# Output: dist/server/
```

---

## Code Organization

### Web User Application

**Routes:**
```
src/routes/
├── __root.tsx       # Root layout with AuthProvider
├── index.tsx        # Home page (service grid)
└── login.tsx        # Login page
```

**Components:**
```
src/components/
├── ProtectedRoute.tsx     # Route guard component
└── LocalLoginForm.tsx     # Login form component
```

**Contexts:**
```
src/contexts/
└── AuthContext.tsx        # Authentication state management
```

**Server:**
```
src/server/
└── index.ts              # Fastify server with auth endpoints
```

**Utilities:**
```
src/lib/
└── auth.ts               # Auth helpers (token verification, etc.)
```

### Web Admin Application

**Routes:**
```
src/routes/
├── __root.tsx       # Root layout with AuthProvider
└── index.tsx        # Dashboard
```

**Components:**
```
src/components/
├── ProtectedTeamPortal.tsx  # Protected portal wrapper
└── LocalLoginForm.tsx       # Admin login form
```

**Server:**
```
src/server/
└── index.ts                 # Fastify server with health check
```

---

## Best Practices

### File Organization
1. ✅ Routes in `src/routes/` - automatically registered by TanStack Router
2. ✅ Reusable components in `src/components/`
3. ✅ Business logic in `src/lib/`
4. ✅ State management in `src/contexts/` or TanStack Query
5. ✅ API routes in `src/server/index.ts`

### Component Structure
```typescript
// Use named exports for components
export function MyComponent() {
  return <div>Content</div>
}

// Use default export for route components
export const Route = createFileRoute('/path')({
  component: MyComponent,
})
```

### API Development
```typescript
// Group related routes
fastify.register(async (fastify) => {
  fastify.post('/auth/login', loginHandler)
  fastify.post('/auth/logout', logoutHandler)
  fastify.get('/auth/me', { preHandler: [authMiddleware] }, meHandler)
}, { prefix: '/api' })
```

### State Management
**Use TanStack Query for server state:**
```typescript
import { useQuery } from '@tanstack/react-query'

function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me')
      return response.json()
    },
  })
}
```

**Use React Context for app state:**
```typescript
// Already implemented in AuthContext
const { user, login, logout } = useAuth()
```

### Database Development
1. ✅ Always create schemas in `overlays/` first
2. ✅ Test with team data before promoting
3. ✅ Use descriptive migration names
4. ✅ Coordinate promotions with platform team
5. ✅ Never modify shared schemas directly

### TypeScript
1. ✅ Let TypeScript infer types when possible
2. ✅ Use interfaces for public APIs
3. ✅ Use types for internal logic
4. ✅ Leverage TanStack Router's type safety
5. ✅ Use path aliases (`@/*`) for imports

---

## Common Tasks

### Adding a New Route

**1. Create route file:**
```bash
touch src/web-user/src/routes/events.tsx
```

**2. Define route:**
```typescript
// src/routes/events.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/events')({
  component: EventsPage,
})

function EventsPage() {
  return <div>Events</div>
}
```

**3. Route is automatically registered!**
- Navigate to `http://localhost:3014/events`
- TanStack Router auto-generates `routeTree.gen.ts`

### Adding an API Endpoint

**1. Edit server file:**
```typescript
// src/server/index.ts
fastify.get('/api/events', async (request, reply) => {
  // Fetch events from database
  return { events: [] }
})
```

**2. Call from frontend:**
```typescript
import { useQuery } from '@tanstack/react-query'

function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await fetch('/api/events')
      return response.json()
    },
  })
}
```

### Adding a Protected Route

```typescript
// src/routes/dashboard.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: Dashboard,
})

function Dashboard() {
  const { user } = useAuth()
  return <div>Welcome, {user?.email}</div>
}
```

### Creating Database Tables

**1. Define schema in overlay:**
```typescript
// src/database/src/overlays/attendees.ts
import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core'

export const attendees = pgTable('attendees', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
})
```

**2. Export from index:**
```typescript
// src/database/src/overlays/index.ts
export * from './attendees'
```

**3. Generate and apply migration:**
```bash
pnpm teamd:db:generate
pnpm teamd:db:migrate
```

**4. Use in queries:**
```typescript
import { db } from '@teamd/database'
import { attendees } from '@teamd/database/overlays'

// Insert
await db.insert(attendees).values({
  eventId: 1,
  name: 'John Doe',
  email: 'john@example.com',
})

// Query
const results = await db.select().from(attendees)
```

---

## Troubleshooting

### Build Fails with "strictNullChecks must be enabled"
**Solution:** Ensure `strictNullChecks: true` in `tsconfig.json`
```json
{
  "compilerOptions": {
    "strictNullChecks": true
  }
}
```

### Vite HMR Not Working
**Check:**
1. ✅ Vite dev server running on correct port
2. ✅ No firewall blocking WebSocket connections
3. ✅ Browser console for HMR errors
4. ✅ Try hard refresh (Cmd+Shift+R)

### API Requests Fail with CORS Error
**Check:**
1. ✅ CORS origin matches client URL
2. ✅ `credentials: true` in CORS config
3. ✅ Cookies enabled in browser
4. ✅ Server running on expected port

### Database Connection Fails
**Check:**
1. ✅ PostgreSQL running (`docker-compose up -d postgres`)
2. ✅ `DATABASE_URL` environment variable set
3. ✅ Database exists (`large_event`)
4. ✅ Migrations applied (`pnpm db:migrate`)

### Routes Not Found (404)
**Check:**
1. ✅ Route file in `src/routes/` directory
2. ✅ Route exported correctly with `createFileRoute`
3. ✅ `routeTree.gen.ts` regenerated (restart dev server)
4. ✅ No typos in route path

### TypeScript Errors on Build
**Check:**
1. ✅ `pnpm install` completed successfully
2. ✅ `tsconfig.json` includes only `src` directory
3. ✅ No `.d.ts` files in root directory
4. ✅ Run `pnpm clean` and rebuild

---

## Environment Variables

### Web User
```env
# Server
PORT=3114
JWT_SECRET=your-secret-key-here
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/large_event
```

### Web Admin
```env
# Server
PORT=3124
JWT_SECRET=your-secret-key-here
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/large_event
```

**Note:** Environment variables can be set in `.env` files (not committed to git).

---

## Testing

### Manual Testing
```bash
# Start dev servers
pnpm dev

# Open in browser
# User: http://localhost:3014
# Admin: http://localhost:3024

# Test login with mock users
# Email: user@teamd.local
# Password: password123
```

### Future Testing Setup
**Planned:**
- Unit tests: Vitest
- Component tests: React Testing Library
- E2E tests: Playwright
- API tests: Supertest

---

## Deployment

### Build for Production
```bash
# Build all applications
pnpm build

# Build individual apps
pnpm build:user
pnpm build:admin
```

### Docker Integration
Team D applications are containerized in the main platform's `docker-compose.yml`:
- **team-d-web-user** (Port 3014) - User portal with embedded Fastify API (port 3114)
- **team-d-web-admin** (Port 3024) - Admin portal with embedded Fastify API (port 3124)
- **team-d-api** (Port 3004) - Currently not implemented; `src/api/` is empty

**Note:** Currently, API logic is embedded within each web app's server (`src/server/index.ts`). The Docker Compose file references a `team-d-api` service on port 3004, but this would require consolidating the separate Fastify servers from web-user and web-admin into a single standalone API in `src/api/`.

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Build succeeds without errors
- [ ] CORS origins updated for production
- [ ] JWT secret is secure and random
- [ ] Logging configured properly
- [ ] Health check endpoints working

---

## Integration with Main Platform

### Iframe Embedding
Team D apps are embedded in the main platform via iframes:

**User Portal:**
```html
<iframe
  src="http://localhost:3014/"
  width="100%"
  height="100%"
  sandbox="allow-scripts allow-same-origin"
/>
```

**Admin Portal:**
```html
<iframe
  src="http://localhost:3024/"
  width="100%"
  height="100%"
  sandbox="allow-scripts allow-same-origin"
/>
```

### Cross-Origin Communication
Use `postMessage` for iframe communication:

**Parent → Iframe:**
```typescript
const iframe = document.getElementById('teamd-iframe')
iframe.contentWindow.postMessage({ type: 'AUTH_TOKEN', token }, '*')
```

**Iframe → Parent:**
```typescript
window.parent.postMessage({ type: 'NAVIGATION', path: '/events' }, '*')
```

### Shared Authentication
Token passed via URL parameter from main portal:
```typescript
// src/lib/auth.ts
export function getAuthTokenFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('token')
}
```

---

## Resources

### Documentation
- [Vite Documentation](https://vitejs.dev/)
- [TanStack Router](https://tanstack.com/router/latest)
- [TanStack Query](https://tanstack.com/query/latest)
- [Fastify Documentation](https://fastify.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

### Team Documentation
- [Main Platform CLAUDE.md](../../CLAUDE.md)
- [Web Admin Auth Guide](src/web-admin/TEAMD_AUTH.md)
- [Database Schema Docs](src/database/README.md) *(if exists)*

### Getting Help
1. Check this DEVREADME first
2. Review component examples in codebase
3. Check main platform documentation
4. Ask in team Discord/Slack channel
5. Create GitHub issue for bugs

---

## Migration Notes

### Completed Migrations
✅ **Next.js → Vite + TanStack Router**
- Date: November 2025
- All API routes moved to Fastify
- Build times improved significantly
- HMR now instant

✅ **Express → Fastify**
- Date: November 2025
- Better performance and type safety
- Plugin-based architecture

### No Nest.js or Module Federation
Team D never used Nest.js or Webpack Module Federation.

---

## Quick Reference

### Port Mapping
| Service | Port | URL |
|---------|------|-----|
| Web User Client | 3014 | http://localhost:3014 |
| Web User API | 3114 | http://localhost:3114 (internal) |
| Web Admin Client | 3024 | http://localhost:3024 |
| Web Admin API | 3124 | http://localhost:3124 (internal) |
| PostgreSQL | 5432 | postgresql://localhost:5432 |
| Drizzle Studio | 4983 | http://localhost:4983 |

### Key Files
| File | Purpose |
|------|---------|
| `pnpm-workspace.yaml` | Workspace configuration |
| `src/web-user/vite.config.ts` | Vite build config |
| `src/web-user/tsconfig.json` | TypeScript config |
| `src/web-user/tailwind.config.js` | Tailwind config |
| `src/web-user/src/routeTree.gen.ts` | Auto-generated routes |
| `src/web-user/src/server/index.ts` | Fastify API server |
| `src/database/drizzle.config.ts` | Database config |

### Common Paths
```typescript
// Import paths (via tsconfig paths)
import { Component } from '@/components/Component'
import { useAuth } from '@/contexts/AuthContext'
import { helper } from '@/lib/helper'

// Database imports
import { db } from '@teamd/database'
import { users } from '@teamd/database/overlays'

// Shared imports (when available)
import { types } from '@large-event/api-types'
```

---

**Last Updated:** November 9, 2025
**Team:** Team D
**Maintainers:** Team D Developers
**Platform:** MacEngSociety Large Event Platform
