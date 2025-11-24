# Detailed TODO List – OpenLP Database Sync Project

_Last updated: 2025-11-24_

This document captures the current implementation status and actionable next steps for every epic in the monorepo. Items are grouped by epic, then by milestone. Each line represents a task that should take no longer than ~2 hours. Use the legend below to interpret the checkboxes.

## Legend
- `[x]` – Completed and merged into `main`
- `[~]` – In progress
- `[ ]` – Not started
- `[!]` – Blocked or needs a decision

## Epic Status Overview

| Epic | Status | Notes |
| --- | --- | --- |
| 1. Monorepo & Tooling | ✅ Complete | Workspace, linting, shared package all set. |
| 2. Backend API & DB | ⏳ Mostly complete | Mongo/Mongoose stack running; remaining work is documentation, Swagger, and seed data. |
| 3. Frontend Application | ⏳ Mostly complete | CRUD UI, verse tooling, auth-aware UX ready; still need error boundaries & polish. |
| 4. OpenLP Sync Tool | ⏳ Feature-complete | CLI + dry-run + Vitest done; packaging + DX polish outstanding. |
| 5. Auth & Permissions | 🔄 Phase 2 underway | Discord OAuth, guards, contexts are live; need UX edge cases and role messaging. |
| 6. Deployment & Environment | ♻️ Partially complete | Docker (dev/prod) ready; documentation + production hardening pending. |

---

## EPIC 1: Monorepo & Tooling Setup (✅ Complete)

### Completed Milestones
- [x] **Task 1.1.1**: Root `package.json` with pnpm workspace scripts (`dev:*`, `build:*`, `test:*`).
- [x] **Task 1.1.2**: `pnpm-workspace.yaml` covering `apps/*` and `packages/*`.
- [x] **Task 1.1.3**: Root `tsconfig.json` with strict mode and path aliases.
- [x] **Task 1.1.4**: Root `.gitignore` & `.prettierignore`.
- [x] **Task 1.2.1**: `@openlp/shared` package scaffolding with build pipeline.
- [x] **Task 1.2.2**: Shared song/tag/OpenLP mapping types.
- [x] **Task 1.2.3**: Shared DTOs (`CreateSongDto`, `UpdateSongDto`, `SongResponseDto`, `PaginatedResponseDto`, `SongQueryDto`).
- [x] **Task 1.2.4**: Barrel exports + workspace protocol wiring.
- [x] **Task 1.3.1**: ESLint config (NestJS, React, TypeScript).
- [x] **Task 1.3.2**: Prettier config + format scripts.
- [x] **Task 1.3.3**: VS Code workspace settings & recommended extensions.
- [x] **Task 1.3.4**: `.env.example` files for `api`, `web`, `sync`.

### Remaining Work
- None. Epic 1 is fully complete.

---

## EPIC 2: Backend API & Database (MongoDB + NestJS)

### Completed Milestones
- [x] **Task 2.1.1**: NestJS project initialized in `apps/api` with modular structure.
- [x] **Task 2.1.2**: Global `ConfigModule`, `.env` templates, typed config helpers.
- [x] **Task 2.1.3**: Folder structure (`songs/`, `auth/`, `audit-log/`, `database/`, `schemas/`).
- [x] **Task 2.2.1**: Migrated to MongoDB 7 + Mongoose 8 (see `DatabaseModule`).
- [x] **Task 2.2.2**: Mongoose schemas for `Song`, `Tag`, `User`, `AuditLog`, with indexes and timestamps.
- [x] **Task 2.3.1**: `SongModule` with dependency wiring + `AuditLogModule`.
- [x] **Task 2.3.2**: `SongService` implementing create/read/update/delete/search, tagging, soft-deletes, and audit log hooks.
- [x] **Task 2.3.3**: `SongController` with REST endpoints (`/songs`, `/songs/search`, `/:id`, `/export/zip`).
- [x] **Task 2.4.1–2.4.5**: DTOs & validation (`CreateSongDto`, `UpdateSongDto`, `QuerySongDto`), `class-validator`, global `ValidationPipe`.
- [x] **Task 2.5.1–2.5.6**: Full CRUD logic with pagination, regex search, tag lookups, and audit logging.
- [x] **Task 2.6.1–2.6.6**: Public GET endpoints, protected mutate endpoints via `EditPermissionGuard`, throttled search + ZIP export.
- [x] **Task 2.7.3**: Global CORS + validation + helmet + Express body limits configured in `main.ts`.
- [x] **Task 2.8.1–2.8.2**: CORS whitelist (multi-origin), API prefix `/api`, throttler guard registered globally.
- [x] **Task 2.10.1–2.10.5**: OpenLP import/migration script (`src/scripts/migrate-openlp.ts`) using better-sqlite3 with XML/verse parsing + logging.
- [x] **Task 2.5.7 (Extension)**: Song ZIP export with `archiver`, sanitized filenames, and audit trail.
- [x] **Task 2.3.4 (Extension)**: Audit logging service + schema capturing edits, deletes, logins, exports.

### Remaining / Upcoming
- [ ] **Task 2.7.1**: Add global HTTP exception filter for consistent API errors (normalize Mongoose, Discord, and validation errors).
- [ ] **Task 2.7.2**: Introduce typed domain exceptions (`SongNotFoundException`, `ValidationException`) used inside services.
- [ ] **Task 2.9.1**: Wire up Swagger/OpenAPI (`@nestjs/swagger`) in `main.ts`, expose `/api/docs`.
- [ ] **Task 2.9.2**: Annotate controllers/DTOs with Swagger decorators + response schemas.
- [ ] **Task 2.11.1**: Seed script (e.g., `scripts/seed.ts`) with representative songs/tags for demo/staging data.
- [ ] **Task 2.11.2**: Document & automate seed execution (`pnpm seed:api`).
- [ ] **Task 2.3.x**: Add unit/integration tests covering ZIP export + audit logging flows (SongService spec currently only covers CRUD basics).

---

## EPIC 3: Frontend Application (React 18 + Vite + MUI)

### Completed Milestones
- [x] **Task 3.1.1–3.1.5**: Vite + React + TypeScript app, path aliases, env handling, Material UI theme + CssBaseline.
- [x] **Task 3.2.1–3.2.3**: React Router v6 layout with protected routes, admin routes, Navbar/Footer/ScrollToTop, Layout component.
- [x] **Task 3.3.1–3.3.3**: API client wrapper (`src/services/api.ts`) w/ token injection, error handling, typed helpers, ZIP export.
- [x] **Task 3.4.1–3.4.6**: React Query hooks (`useSongs`, `useSong`, `useCreateSong`, `useUpdateSong`, `useDeleteSong`, `useExportZip`).
- [x] **Task 3.5.1–3.5.3**: Shared components (Navbar, Layout, Footer, ThemeToggle, SettingsDialog) using MUI system.
- [x] **Task 3.6.1–3.6.5**: Song list experience with search (debounced), filter sidebar, responsive layout, loading & empty states.
- [x] **Task 3.7.1–3.7.4**: Advanced `SongForm` with verse editor, order management, validation, XML/string parsing helpers.
- [x] **Task 3.8.1–3.8.3**: Song detail/edit/delete flows with confirmation dialogs and notifications.
- [x] **Task 3.9.1–3.9.2**: Song create page + success navigation + notifications.
- [x] **Task 3.10.1–3.10.2**: Responsive layout + mobile-first Navbar (sticky AppBar, touch-friendly spacing).
- [x] **Task 3.11.2**: Toast/notification system via `NotificationContext` + MUI Snackbar (centralized success/error UX).
- [x] **Task 3.11.3**: Loading states with `CircularProgress`, disabled submit buttons during mutations, skeleton placeholders on lists.
- [x] **Task 3.12.1–3.12.3**: Verse parsing utilities, verse order string editing, async form resets.
- [x] **Task 3.13 (Extension)**: Auth-aware UI (ProtectedRoute, AdminRoute, login/logout buttons in Navbar).

### Remaining / Upcoming
- [ ] **Task 3.10.3**: Formal mobile QA – capture screenshots + fix any touch issues observed on iOS/Android hardware.
- [ ] **Task 3.11.1**: Error boundary component wrapping route tree with friendly fallback + reset option.
- [ ] **Task 3.6.x**: Add saved filter presets + multi-select tags UI (currently tags optional).
- [ ] **Task 3.14 (New)**: Add offline warning & retry banner when network fails (bubble up `ApiError` status 0).
- [ ] **Task 3.15 (New)**: Implement audit log page filters (front-end stub exists; needs UI polish + pagination controls).
- [x] **Task 3.16.1 (New)**: Add Playwright E2E suite (list/search, CRUD, auth, export) and document in `docs/E2E_TEST_STRATEGY.md` (Completed 2025-11-24).

---

## EPIC 4: OpenLP Sync Tool (Node.js CLI)

### Completed Milestones
- [x] **Task 4.1.1–4.1.3**: `apps/sync` TypeScript CLI scaffold (pnpm scripts, tsconfig, vitest, build).
- [x] **Task 4.2.1–4.2.3**: Config loader (`loadConfig`) with env + `.env` support and strong typing.
- [x] **Task 4.3.1–4.3.6**: `OpenLPDatabaseService` (better-sqlite3) for read/write/list operations, metadata parsing.
- [x] **Task 4.4.1–4.4.4**: `ApiClientService` with pagination helpers + error handling (axios).
- [x] **Task 4.5.1–4.5.4**: Mapping utilities embedded in `SyncService` (UUID metadata in comments, verse order preservation).
- [x] **Task 4.6.1–4.6.4**: `SyncService` implementing reconciliation (create/update/delete), progress summaries, force mode.
- [x] **Task 4.6.5**: Dry-run support with change summary and zero writes.
- [x] **Task 4.7.1–4.7.2**: Custom logger utility with log levels + verbose flag.
- [x] **Task 4.8.1–4.8.4**: Commander CLI commands (`sync`, `sync-song`, `list`) + version + help text.
- [x] **Task 4.9.1–4.9.3**: Error handling, exit codes (0/1), aggregate stats.
- [x] **Task 4.11.1–4.11.3**: Vitest unit tests for SyncService, ApiClientService, and OpenLPDb service with mocks.

### Remaining / Upcoming
- [ ] **Task 4.7.3 (New)**: Log file output option (`--log-file`) for audit trails on church PC.
- [ ] **Task 4.8.5 (New)**: `import` command (OpenLP ➜ backend) using existing mapping utilities for one-time migrations.
- [ ] **Task 4.10.1**: Windows batch launcher (`sync.bat`) & README snippet for double-click execution.
- [ ] **Task 4.10.2**: End-user installation guide (copy CLI build + .env template to church PC).
- [ ] **Task 4.12 (New)**: Packaging exploration (pkg / nexe) or simple `pnpm dlx` instructions for volunteers.

---

## EPIC 5: Auth & Permissions (Discord OAuth – Phase 2)

### Completed Milestones
- [x] **Task 5.1.1**: Discord application + bot wiring (client ID/secret, callback URL documented in `.env.example` and `docs/DISCORD_AUTH_SETUP.md`).
- [x] **Task 5.1.3**: Auth dependencies installed (`@nestjs/passport`, `passport-discord`, `@nestjs/jwt`, etc.).
- [x] **Task 5.2.1**: `User` schema via Mongoose (Discord IDs, roles, timestamps).
- [x] **Task 5.2.2**: `DiscordStrategy` w/ guild membership + role validation + verbose troubleshooting logs.
- [x] **Task 5.2.3**: Discord helper methods inside `AuthService` (`getGuildMember`, `verifyBotGuildAccess`) with rate-limit retries.
- [x] **Task 5.2.4–5.2.6**: `AuthModule`, `/auth/discord`, `/auth/discord/callback`, `/auth/me`, `/auth/logout`, dev login bypass.
- [x] **Task 5.2.7**: Guards (`JwtAuthGuard`, `EditPermissionGuard`, `DiscordAuthGuard`) applied to routes.
- [x] **Task 5.2.8**: Environment variable plumbing for Discord + JWT secrets.
- [x] **Task 5.3.1**: Frontend `AuthProvider` + context with token persistence and React Query integration.
- [x] **Task 5.3.2**: Login page & callback handling (redirect + token storage).
- [x] **Task 5.3.4**: Protected routes (`ProtectedRoute`, `AdminRoute`) gating editing/audit log screens.
- [x] **Task 5.3.5**: API client automatically includes JWT token (Authorization header).
- [x] **Task 5.3.6**: Logout UX (clears token + query cache, server endpoint responds 200).
- [x] **Task 5.3.8 (Extension)**: Admin-only Audit Log view + Settings dialog.

### Remaining / Upcoming
- [ ] **Task 5.1.2**: Optional Discord bot role-check automation (invite helper scripts + docs).
- [ ] **Task 5.3.3**: User profile dropdown now shows avatar; need dedicated profile page with role list + permissions info.
- [ ] **Task 5.3.5b**: Handle 401 responses globally (auto logout + redirect to `/login` when token expires).
- [ ] **Task 5.3.7**: Friendly messaging for users missing required Discord role + instructions to contact admin.
- [ ] **Task 5.4.1**: Formalize Discord API error handling (rate limit telemetry, exponential backoff metrics).
- [ ] **Task 5.4.3**: Token refresh / re-auth flow (optional but recommended before production).

---

## EPIC 6: Deployment & Environment

### Completed Milestones
- [x] **Task 6.1.1**: `apps/api/Dockerfile` (multi-stage, Node 22, production build).
- [x] **Task 6.1.2**: `apps/web/Dockerfile` (Node 22 build + nginx serve with `nginx.conf`).
- [x] **Task 6.1.3**: `docker-compose.dev.yml` with MongoDB, API, hot-reloaded web, shared envs.
- [x] **Task 6.1.4**: `docker-compose.prod.yml` (Mongo, API, Web) with health checks, env injection, secrets.
- [x] **Task 6.1.5**: `.dockerignore` files for API/Web.
- [x] **Task 6.1.6**: `docs/DOCKER_SETUP.md` covering dev/prod flows + troubleshooting.
- [x] **Task 6.2.1**: Production Dockerfile for backend (multi-stage).
- [x] **Task 6.2.4**: Production logging basics (stdout structured logs, throttler metrics).
- [x] **Task 6.3.1**: Vite production build optimized (see `apps/web` README + `vite.config.ts` tweaks).
- [x] **Task 6.4.1**: Root README updated with quick start, docker instructions, and context files.
- [x] **Task 6.4.2**: Docs set (`PROJECT_PLAN`, `ARCHITECTURE`, `ADRs`, etc.) kept in sync with Mongo migration.

### Remaining / Upcoming
- [ ] **Task 6.2.2**: Production `.env.example` + checklist for secrets/Discord tokens.
- [ ] **Task 6.2.3**: Dedicated `/api/health` already exists—document uptime checks + monitoring plan.
- [ ] **Task 6.3.2**: Document static hosting alternative (e.g., Vercel/Netlify) with environment overrides.
- [ ] **Task 6.4.3**: API documentation (Markdown or Swagger export) with request/response examples.
- [ ] **Task 6.4.4**: End-to-end deployment guide (Mongo provisioning, docker compose, sync tool install on church PC).
- [ ] **Task 6.5 (New)**: CI pipeline (lint + test + build) using GitHub Actions.

---

## Recent Highlights (Snapshot: 2025-11-24)

- ✅ Backend migrated from PostgreSQL/Prisma plan to MongoDB/Mongoose with audit logging, Discord auth, rate limiting, ZIP export, and OpenLP import.
- ✅ Frontend delivers full CRUD, verse parsing, auth-aware UX, responsive layout, and global notifications.
- ✅ Sync tool provides dry-run, verbose logging, and unit-tested reconciliation logic.
- ✅ Docker dev/prod workflows finalized; docs refreshed across architecture, rules, and context files.

Use this document to identify the next actionable task before writing code or updating documentation. Update the checkboxes and descriptions whenever work lands in `main`.

## EPIC 1: Monorepo & Tooling Setup

### 1.1 Initialize Monorepo Foundation

- [x] **Task 1.1.1**: Create root `package.json` with workspace configuration
  - Add pnpm workspace scripts
  - Define root-level dependencies (TypeScript, ESLint, Prettier)
  - Add scripts: `dev:web`, `dev:api`, `dev:sync`, `build:all`, `test:all`
  - Estimated: 30 min

- [x] **Task 1.1.2**: Create `pnpm-workspace.yaml`
  - Define workspace packages: `apps/*`, `packages/*`
  - Configure workspace protocol
  - Estimated: 15 min

- [x] **Task 1.1.3**: Set up root TypeScript configuration
  - Create `tsconfig.json` with base config
  - Configure path aliases if needed
  - Set strict mode
  - Estimated: 20 min

- [x] **Task 1.1.4**: Create root `.gitignore`
  - Ignore node_modules, build outputs, .env files
  - Add IDE-specific ignores
  - Estimated: 10 min

### 1.2 Shared Types Package

- [x] **Task 1.2.1**: Initialize `packages/shared` package
  - Create `package.json` with name `@openlp/shared`
  - Set up TypeScript build configuration
  - Add build script
  - Estimated: 30 min

- [x] **Task 1.2.2**: Define base song types and interfaces
  - Create `src/types/song.ts` with `Song`, `Verse`, `Tag` interfaces
  - Match backend Prisma schema structure
  - Export types
  - Estimated: 45 min

- [x] **Task 1.2.3**: Create DTO types for API communication
  - Create `src/dto/create-song.dto.ts`
  - Create `src/dto/update-song.dto.ts`
  - Create `src/dto/song-response.dto.ts`
  - Create `src/dto/paginated-response.dto.ts`
  - Estimated: 1 hour

- [x] **Task 1.2.4**: Set up package exports and barrel files
  - Create `src/index.ts` to export all types
  - Configure package.json exports field
  - Test import from other packages
  - Estimated: 30 min

### 1.3 Development Tooling

- [x] **Task 1.3.1**: Configure ESLint for monorepo
  - Install ESLint and plugins
  - Create root `.eslintrc.js`
  - Configure for TypeScript, React, NestJS
  - Add workspace-specific overrides
  - Estimated: 1 hour

- [x] **Task 1.3.2**: Configure Prettier
  - Create `.prettierrc` and `.prettierignore`
  - Set up format scripts
  - Configure VS Code settings (optional)
  - Estimated: 30 min

- [x] **Task 1.3.3**: Set up VS Code workspace settings (optional)
  - Create `.vscode/settings.json`
  - Configure recommended extensions
  - Set up debug configurations
  - Estimated: 30 min

- [x] **Task 1.3.4**: Create environment variable templates
  - Create `.env.example` for each app
  - Document required variables
  - Add to `.gitignore`
  - Estimated: 30 min

---

## EPIC 2: Backend API & Database

### 2.1 NestJS Project Setup

- [ ] **Task 2.1.1**: Initialize NestJS application in `apps/api`
  - Use NestJS CLI to create project
  - Configure TypeScript
  - Set up project structure
  - Estimated: 30 min

- [ ] **Task 2.1.2**: Configure environment variables
  - Install `@nestjs/config`
  - Create `.env.example`
  - Set up ConfigModule
  - Define environment schema
  - Estimated: 45 min

- [ ] **Task 2.1.3**: Set up project structure
  - Create folder structure: `src/songs/`, `src/common/`, `src/config/`
  - Set up barrel exports
  - Configure path aliases
  - Estimated: 30 min

### 2.2 Database Setup with Prisma

- [ ] **Task 2.2.1**: Install and configure Prisma
  - Install Prisma dependencies
  - Initialize Prisma: `npx prisma init`
  - Configure database connection
  - Estimated: 30 min

- [ ] **Task 2.2.2**: Design and create Prisma schema
  - Define `Song` model with all fields
  - Define `Verse` model with relation to Song
  - Define `Tag` model with many-to-many relation
  - Define `OpenLPMapping` model
  - Add indexes for performance
  - Estimated: 1.5 hours

- [ ] **Task 2.2.3**: Create initial migration
  - Run `prisma migrate dev --name init`
  - Review generated migration
  - Test database connection
  - Estimated: 30 min

- [ ] **Task 2.2.4**: Generate Prisma Client
  - Run `prisma generate`
  - Verify client generation
  - Set up Prisma service
  - Estimated: 20 min

- [ ] **Task 2.2.5**: Create PrismaModule and PrismaService
  - Create `src/prisma/prisma.module.ts`
  - Create `src/prisma/prisma.service.ts`
  - Implement lifecycle hooks (onModuleInit, onModuleDestroy)
  - Export PrismaModule globally
  - Estimated: 1 hour

### 2.3 Song Module - Core Structure

- [ ] **Task 2.3.1**: Create SongModule
  - Create `src/songs/song.module.ts`
  - Import PrismaModule
  - Set up module structure
  - Estimated: 20 min

- [ ] **Task 2.3.2**: Create SongService skeleton
  - Create `src/songs/song.service.ts`
  - Inject PrismaService
  - Add basic structure
  - Estimated: 30 min

- [ ] **Task 2.3.3**: Create SongController skeleton
  - Create `src/songs/song.controller.ts`
  - Define route decorators
  - Inject SongService
  - Estimated: 30 min

### 2.4 DTOs and Validation

- [ ] **Task 2.4.1**: Install validation dependencies
  - Install `class-validator` and `class-transformer`
  - Configure ValidationPipe globally
  - Estimated: 30 min

- [ ] **Task 2.4.2**: Create CreateSongDto
  - Define fields: title, number, language, chorus, verses, tags
  - Add validation decorators
  - Create nested DTOs for Verse
  - Estimated: 1 hour

- [ ] **Task 2.4.3**: Create UpdateSongDto
  - Make all fields optional
  - Use PartialType or similar
  - Estimated: 30 min

- [ ] **Task 2.4.4**: Create QueryDto for list/search endpoints
  - Fields: page, limit, language, tags, search
  - Add validation and defaults
  - Estimated: 45 min

- [ ] **Task 2.4.5**: Create response DTOs
  - SongResponseDto with all relations
  - PaginatedResponseDto
  - Estimated: 45 min

### 2.5 Song Service - CRUD Operations

- [ ] **Task 2.5.1**: Implement `create()` method
  - Validate input
  - Create song with verses and tags
  - Handle tag creation/linking
  - Return created song with relations
  - Estimated: 1.5 hours

- [ ] **Task 2.5.2**: Implement `findAll()` method
  - Support pagination
  - Support filtering by language, tags
  - Support search by title
  - Return paginated response
  - Estimated: 1.5 hours

- [ ] **Task 2.5.3**: Implement `findOne()` method
  - Find by ID
  - Include verses and tags
  - Throw NotFoundException if not found
  - Estimated: 45 min

- [ ] **Task 2.5.4**: Implement `update()` method
  - Handle partial updates
  - Update verses (add/update/delete)
  - Update tags
  - Return updated song
  - Estimated: 2 hours

- [ ] **Task 2.5.5**: Implement `remove()` method
  - Delete song (or soft delete)
  - Handle cascade deletion of verses
  - Remove tag associations
  - Estimated: 45 min

- [ ] **Task 2.5.6**: Implement `search()` method
  - Full-text search on title and content
  - Support pagination
  - Return results
  - Estimated: 1 hour

### 2.6 Song Controller - REST Endpoints

- [ ] **Task 2.6.1**: Implement GET /songs endpoint
  - Use QueryDto for filters
  - Call service.findAll()
  - Return paginated response
  - Estimated: 45 min

- [ ] **Task 2.6.2**: Implement GET /songs/:id endpoint
  - Extract ID from params
  - Call service.findOne()
  - Handle NotFoundException
  - Estimated: 30 min

- [ ] **Task 2.6.3**: Implement POST /songs endpoint
  - Validate CreateSongDto
  - Call service.create()
  - Return 201 with created song
  - Estimated: 45 min

- [ ] **Task 2.6.4**: Implement PATCH /songs/:id endpoint
  - Validate UpdateSongDto
  - Call service.update()
  - Return updated song
  - Estimated: 45 min

- [ ] **Task 2.6.5**: Implement DELETE /songs/:id endpoint
  - Call service.remove()
  - Return 204 No Content
  - Estimated: 30 min

- [ ] **Task 2.6.6**: Implement GET /songs/search endpoint
  - Extract query parameter
  - Call service.search()
  - Return results
  - Estimated: 45 min

### 2.7 Error Handling

- [ ] **Task 2.7.1**: Create global exception filter
  - Create `src/common/filters/http-exception.filter.ts`
  - Format error responses consistently
  - Handle Prisma errors
  - Estimated: 1.5 hours

- [ ] **Task 2.7.2**: Create custom exceptions
  - SongNotFoundException
  - ValidationException
  - Estimated: 30 min

- [ ] **Task 2.7.3**: Configure global ValidationPipe
  - Set up in main.ts
  - Configure transform options
  - Estimated: 30 min

### 2.8 CORS and API Configuration

- [ ] **Task 2.8.1**: Configure CORS
  - Set up CORS in main.ts
  - Allow frontend origin
  - Configure credentials if needed
  - Estimated: 30 min

- [ ] **Task 2.8.2**: Set up API prefix
  - Configure global prefix `/api`
  - Update all routes
  - Estimated: 20 min

### 2.9 Swagger/OpenAPI Documentation

- [ ] **Task 2.9.1**: Install and configure Swagger
  - Install `@nestjs/swagger`
  - Configure in main.ts
  - Set up SwaggerModule
  - Estimated: 45 min

- [ ] **Task 2.9.2**: Add Swagger decorators to controller
  - Add @ApiTags, @ApiOperation, @ApiResponse
  - Document DTOs with @ApiProperty
  - Estimated: 1 hour

### 2.10 OpenLP Import Script

- [ ] **Task 2.10.1**: Create import script structure
  - Create `scripts/import-openlp.ts`
  - Set up script runner
  - Estimated: 30 min

- [ ] **Task 2.10.2**: Implement SQLite reader
  - Install better-sqlite3
  - Connect to OpenLP database
  - Read songs and verses
  - Estimated: 1.5 hours

- [ ] **Task 2.10.3**: Implement mapping logic
  - Map OpenLP schema to our Song model
  - Handle verses and chorus
  - Map tags/categories
  - Estimated: 2 hours

- [ ] **Task 2.10.4**: Implement import to database
  - Create songs in Prisma
  - Store OpenLP IDs in mapping table
  - Handle duplicates
  - Add progress logging
  - Estimated: 2 hours

- [ ] **Task 2.10.5**: Add error handling and reporting
  - Handle import errors gracefully
  - Generate import report
  - Estimated: 1 hour

### 2.11 Database Seeding

- [ ] **Task 2.11.1**: Create seed script
  - Create `prisma/seed.ts`
  - Add sample songs with verses
  - Configure in package.json
  - Estimated: 1 hour

- [ ] **Task 2.11.2**: Test seed script
  - Run seed
  - Verify data in database
  - Estimated: 30 min

---

## EPIC 3: Frontend Application

### 3.1 React + Vite Setup

- [ ] **Task 3.1.1**: Initialize Vite + React project in `apps/web`
  - Use Vite template: `npm create vite@latest`
  - Configure TypeScript
  - Set up project structure
  - Estimated: 30 min

- [ ] **Task 3.1.2**: Install dependencies
  - React Router v6
  - HTTP client (axios or fetch wrapper)
  - React Query or SWR
  - Material UI (MUI)
  - Form library (React Hook Form)
  - Estimated: 30 min

- [ ] **Task 3.1.3**: Configure Material UI
  - Install @mui/material, @mui/icons-material, @emotion/react, @emotion/styled
  - Set up MUI theme provider
  - Configure theme (colors, typography, breakpoints)
  - Set up CssBaseline for consistent styling
  - Estimated: 1 hour

- [ ] **Task 3.1.4**: Set up environment variables
  - Create `.env.example`
  - Configure Vite env variables
  - Set up API URL
  - Estimated: 30 min

- [ ] **Task 3.1.5**: Configure path aliases
  - Set up `@/` alias for src
  - Configure in vite.config.ts and tsconfig.json
  - Estimated: 20 min

### 3.2 Routing Setup

- [ ] **Task 3.2.1**: Install and configure React Router
  - Install react-router-dom
  - Create router configuration
  - Set up route definitions
  - Estimated: 45 min

- [ ] **Task 3.2.2**: Create route structure
  - `/` - SongListPage
  - `/songs/new` - SongCreatePage
  - `/songs/:id` - SongDetailPage
  - Add NotFound route
  - Estimated: 1 hour

- [ ] **Task 3.2.3**: Create layout component
  - Create AppLayout with navigation
  - Add header/footer
  - Make mobile-responsive
  - Estimated: 1 hour

### 3.3 API Client Service

- [ ] **Task 3.3.1**: Create API client base
  - Create `src/services/api.ts`
  - Set up base URL from env
  - Configure fetch/axios instance
  - Estimated: 1 hour

- [ ] **Task 3.3.2**: Implement request/response interceptors
  - Add error handling
  - Transform responses
  - Handle authentication (future)
  - Estimated: 1 hour

- [ ] **Task 3.3.3**: Create song API methods
  - `getSongs(params)`
  - `getSong(id)`
  - `createSong(data)`
  - `updateSong(id, data)`
  - `deleteSong(id)`
  - `searchSongs(query)`
  - Estimated: 1.5 hours

### 3.4 Custom Hooks

- [ ] **Task 3.4.1**: Set up React Query/SWR
  - Install and configure
  - Create query client/provider
  - Wrap app with provider
  - Estimated: 45 min

- [ ] **Task 3.4.2**: Create useSongs hook
  - Fetch song list with filters
  - Handle pagination
  - Return data, loading, error
  - Estimated: 1 hour

- [ ] **Task 3.4.3**: Create useSong hook
  - Fetch single song by ID
  - Handle loading and error states
  - Estimated: 45 min

- [ ] **Task 3.4.4**: Create useCreateSong hook
  - Mutation for creating song
  - Handle success/error
  - Invalidate queries on success
  - Estimated: 45 min

- [ ] **Task 3.4.5**: Create useUpdateSong hook
  - Mutation for updating song
  - Optimistic updates
  - Estimated: 45 min

- [ ] **Task 3.4.6**: Create useDeleteSong hook
  - Mutation for deleting song
  - Handle confirmation
  - Estimated: 45 min

### 3.5 UI Components - Core

- [ ] **Task 3.5.1**: Set up Material UI components
  - Use MUI Button, TextField, TextareaAutosize, CircularProgress, Alert
  - Create wrapper components if needed for consistency
  - Configure theme variants
  - Estimated: 1 hour

- [ ] **Task 3.5.2**: Create custom MUI theme
  - Define color palette
  - Configure typography
  - Set up breakpoints for mobile
  - Create theme file
  - Estimated: 1 hour

- [ ] **Task 3.5.3**: Create reusable MUI-based components
  - Custom Button wrapper (if needed)
  - Custom TextField wrapper with error handling
  - LoadingSpinner using CircularProgress
  - ErrorDisplay using Alert component
  - Estimated: 1.5 hours

### 3.6 Song List Components

- [ ] **Task 3.6.1**: Create SearchBar component
  - Text input for search
  - Debounce input (300ms)
  - Clear button
  - Estimated: 1 hour

- [ ] **Task 3.6.2**: Create FilterBar component
  - Language dropdown
  - Tags multi-select
  - Clear filters button
  - Estimated: 1.5 hours

- [ ] **Task 3.6.3**: Create SongCard component
  - Display song title, number, language
  - Show tags as chips
  - Show verse count
  - Click to navigate to detail
  - Estimated: 1.5 hours

- [ ] **Task 3.6.4**: Create SongList component
  - Render list of SongCards
  - Handle empty state
  - Show loading skeleton
  - Estimated: 1 hour

- [ ] **Task 3.6.5**: Create SongListPage
  - Combine SearchBar, FilterBar, SongList
  - Handle filters in URL query params
  - Add "Create New Song" button
  - Estimated: 1.5 hours

### 3.7 Song Form Components

- [x] **Task 3.7.1**: Create VerseEditor component
  - Textarea for verse content
  - Label input (optional)
  - Order indicator
  - Delete button
  - Estimated: 1.5 hours
  - **Completed**: 2025-01-22 - Implemented in SongForm with individual verse editing boxes

- [x] **Task 3.7.2**: Create VerseList component
  - Display verses in order
  - Show labels
  - Edit mode toggle
  - Reorder buttons (up/down)
  - Estimated: 2 hours
  - **Completed**: 2025-01-22 - Integrated into SongForm with move up/down buttons

- [x] **Task 3.7.3**: Create SongForm component
  - Form fields: title, number, language
  - Chorus textarea
  - Tags input (autocomplete or chips)
  - VerseList integration
  - Add/remove verse buttons
  - Estimated: 3 hours
  - **Completed**: 2025-01-22 - Full implementation with verse parsing from XML, individual verse editing, verse type selection (verse/chorus/bridge/pre-chorus/tag), and verse order management. Removed "Chorus", "Tags", and "Number" fields per user request.

- [x] **Task 3.7.4**: Add form validation
  - Validate required fields
  - Validate verse content not empty
  - Show validation errors
  - Prevent submission if invalid
  - Estimated: 1.5 hours
  - **Completed**: 2025-01-22 - React Hook Form validation implemented with error messages

### 3.8 Song Detail Page

- [x] **Task 3.8.1**: Create SongDetailPage structure
  - Fetch song by ID
  - Display song details (read-only)
  - Edit button
  - Estimated: 1 hour
  - **Completed**: 2025-01-22 - Implemented with verse parsing and display, shows verse order

- [x] **Task 3.8.2**: Implement edit mode
  - Toggle between view and edit
  - Use SongForm in edit mode
  - Save and cancel buttons
  - Estimated: 1.5 hours
  - **Completed**: 2025-01-22 - Edit page uses SongForm component, handles async data loading with useEffect

- [x] **Task 3.8.3**: Add delete functionality
  - Delete button with confirmation
  - Use useDeleteSong hook
  - Navigate to list on success
  - Estimated: 1 hour
  - **Completed**: 2025-01-22 - Delete dialog with confirmation implemented

### 3.9 Song Create Page

- [x] **Task 3.9.1**: Create SongCreatePage
  - Use SongForm component
  - Initialize empty form
  - Handle form submission
  - Estimated: 1 hour
  - **Completed**: 2025-01-22 - SongCreatePage implemented

- [x] **Task 3.9.2**: Add success handling
  - Show success message
  - Navigate to detail page on success
  - Estimated: 30 min
  - **Completed**: 2025-01-22 - Navigation on success implemented

### 3.12 Verse Parsing & Management

- [x] **Task 3.12.1**: Create verse parser utility
  - Parse XML format verses from OpenLP
  - Parse plain string format verses
  - Handle CDATA sections
  - Extract verse labels and types
  - Estimated: 2 hours
  - **Completed**: 2025-01-22 - `verseParser.ts` utility created with `parseVersesFromXml`, `parseVersesFromString`, `parseVerses`, `combineVersesToString`, `getVerseDisplayLabel`, `generateVerseOrderString`, `parseVerseOrderString`

- [x] **Task 3.12.2**: Implement verse order management
  - Display verse order as editable string (e.g., "v1 c1 v2 c1")
  - Parse verse order string to update verse sequence
  - Preserve verse_order from OpenLP
  - Estimated: 1.5 hours
  - **Completed**: 2025-01-22 - Verse order input field added to SongForm, supports editing order string

- [x] **Task 3.12.3**: Fix async form data loading
  - Handle async song data in forms
  - Reset form when song data loads
  - Prevent form errors with null/undefined data
  - Estimated: 1 hour
  - **Completed**: 2025-01-22 - Added useEffect hook to reset form when song data loads asynchronously

### 3.10 Mobile Optimization

- [ ] **Task 3.10.1**: Optimize layout for mobile with MUI
  - Use MUI Grid and Box for responsive layouts
  - Configure MUI breakpoints for mobile
  - Ensure touch-friendly components (MUI handles this)
  - Test responsive behavior
  - Estimated: 1.5 hours

- [ ] **Task 3.10.2**: Add mobile navigation
  - Bottom navigation bar (optional)
  - Hamburger menu (if needed)
  - Estimated: 1.5 hours

- [ ] **Task 3.10.3**: Test on mobile devices
  - Test on actual phones
  - Fix touch issues
  - Optimize performance
  - Estimated: 1 hour

### 3.11 Error Handling & UX

- [ ] **Task 3.11.1**: Add error boundaries
  - Create ErrorBoundary component
  - Wrap routes
  - Display fallback UI
  - Estimated: 1 hour

- [ ] **Task 3.11.2**: Add toast notifications
  - Install toast library (react-hot-toast)
  - Show success/error messages
  - Estimated: 45 min

- [ ] **Task 3.11.3**: Add loading states
  - Loading skeletons
  - Disable buttons during submission
  - Estimated: 1 hour

---

## EPIC 4: OpenLP Sync Tool

### 4.1 CLI Project Setup

- [ ] **Task 4.1.1**: Initialize Node.js CLI project in `apps/sync`
  - Create package.json
  - Set up TypeScript
  - Configure build
  - Estimated: 30 min

- [ ] **Task 4.1.2**: Install dependencies
  - better-sqlite3
  - axios or fetch
  - commander.js
  - winston (logging)
  - Estimated: 30 min

- [ ] **Task 4.1.3**: Set up project structure
  - Create folders: `src/config/`, `src/services/`, `src/utils/`
  - Create entry point `src/index.ts`
  - Estimated: 30 min

### 4.2 Configuration System

- [ ] **Task 4.2.1**: Define configuration interface
  - Create `src/config/config.interface.ts`
  - Define: openlpDbPath, apiUrl, apiKey, etc.
  - Estimated: 30 min

- [ ] **Task 4.2.2**: Implement config loader
  - Support JSON config file
  - Support environment variables
  - Validate configuration
  - Estimated: 1.5 hours

- [ ] **Task 4.2.3**: Create example config file
  - Create `config.example.json`
  - Document all options
  - Estimated: 30 min

### 4.3 OpenLP Database Service

- [ ] **Task 4.3.1**: Create OpenLPDbService class
  - Connect to SQLite database
  - Handle connection errors
  - Estimated: 1 hour

- [ ] **Task 4.3.2**: Implement getAllSongs method
  - Read all songs from OpenLP
  - Parse backend UUID from comments
  - Return mapped data
  - Estimated: 1.5 hours

- [ ] **Task 4.3.3**: Implement getSongById method
  - Find song by OpenLP ID
  - Return song data
  - Estimated: 45 min

- [ ] **Task 4.3.4**: Implement insertSong method
  - Insert new song into OpenLP
  - Insert verses
  - Store backend UUID in comments
  - Estimated: 2 hours

- [ ] **Task 4.3.5**: Implement updateSong method
  - Update existing song
  - Update verses (delete old, insert new)
  - Update metadata
  - Estimated: 2 hours

- [ ] **Task 4.3.6**: Implement deleteSong method
  - Delete song and verses
  - Handle foreign key constraints
  - Estimated: 1 hour

### 4.4 API Client Service

- [ ] **Task 4.4.1**: Create ApiClientService class
  - Set up HTTP client (axios)
  - Configure base URL
  - Add authentication headers
  - Estimated: 1 hour

- [ ] **Task 4.4.2**: Implement getAllSongs method
  - Call GET /api/songs
  - Handle pagination
  - Return all songs
  - Estimated: 1 hour

- [ ] **Task 4.4.3**: Implement getChangedSongs method (optional)
  - Call GET /api/songs?updatedSince=...
  - For incremental sync
  - Estimated: 1 hour

- [ ] **Task 4.4.4**: Add error handling
  - Handle network errors
  - Handle API errors
  - Retry logic (optional)
  - Estimated: 1 hour

### 4.5 Mapping Utilities

- [ ] **Task 4.5.1**: Inspect OpenLP schema
  - Connect to OpenLP DB
  - Document table structure
  - Understand verse storage
  - Estimated: 1 hour

- [ ] **Task 4.5.2**: Create mapBackendToOpenLP function
  - Map backend Song to OpenLP format
  - Combine verses and chorus
  - Handle verse types
  - Estimated: 2 hours

- [ ] **Task 4.5.3**: Create mapOpenLPToBackend function
  - Map OpenLP song to backend format
  - Split verses and chorus
  - Handle metadata
  - Estimated: 2 hours

- [ ] **Task 4.5.4**: Create metadata serializer
  - Serialize backend UUID to JSON
  - Store in OpenLP comments field
  - Parse metadata on read
  - Estimated: 1 hour

### 4.6 Sync Service

- [x] **Task 4.6.1**: Create SyncService class
  - Inject OpenLPDbService and ApiClientService
  - Set up structure
  - Estimated: 30 min
  - **Completed**: 2025-01-22 - SyncService implemented with sync logic

- [x] **Task 4.6.2**: Implement sync algorithm - fetch phase
  - Fetch all songs from backend
  - Fetch all songs from OpenLP
  - Extract UUID mappings
  - Estimated: 1.5 hours
  - **Completed**: 2025-01-22 - Implemented in SyncService

- [x] **Task 4.6.3**: Implement sync algorithm - reconciliation
  - Compare backend and OpenLP songs
  - Determine: insert, update, delete
  - Create change list
  - Estimated: 2 hours
  - **Completed**: 2025-01-22 - Reconciliation logic implemented

- [x] **Task 4.6.4**: Implement sync algorithm - execution
  - Execute inserts
  - Execute updates
  - Execute deletes (optional for MVP)
  - Handle errors per song
  - Estimated: 2.5 hours
  - **Completed**: 2025-01-22 - Execution phase implemented

- [ ] **Task 4.6.5**: Add dry-run mode
  - Skip actual database writes
  - Generate change report
  - Display summary
  - Estimated: 1.5 hours

### 4.11 Unit Testing

- [x] **Task 4.11.1**: Create unit tests for SyncService
  - Test sync algorithm logic
  - Mock OpenLPDbService and ApiClientService
  - Test error handling
  - Estimated: 2 hours
  - **Completed**: 2025-01-22 - Comprehensive unit tests created with Vitest

- [x] **Task 4.11.2**: Create unit tests for ApiClientService
  - Test API calls and error handling
  - Mock axios
  - Test pagination handling
  - Estimated: 1.5 hours
  - **Completed**: 2025-01-22 - Unit tests created with Vitest, mocking axios

- [x] **Task 4.11.3**: Migrate testing framework to Vitest
  - Replace Jest with Vitest
  - Update test configuration
  - Update test syntax
  - Estimated: 1 hour
  - **Completed**: 2025-01-22 - Successfully migrated from Jest to Vitest, all tests passing

### 4.7 Logging

- [ ] **Task 4.7.1**: Set up Winston logger
  - Configure log levels
  - Set up file logging
  - Format log messages
  - Estimated: 1 hour

- [ ] **Task 4.7.2**: Add logging throughout sync
  - Log sync start/end
  - Log each song processed
  - Log errors with context
  - Estimated: 1 hour

### 4.8 CLI Interface

- [ ] **Task 4.8.1**: Set up commander.js
  - Define commands: `sync`, `import`
  - Add options: `--config`, `--dry-run`, `--verbose`
  - Estimated: 1.5 hours

- [ ] **Task 4.8.2**: Implement sync command
  - Call SyncService
  - Display progress
  - Show summary
  - Estimated: 1 hour

- [ ] **Task 4.8.3**: Implement import command (one-time)
  - Import from OpenLP to backend
  - Use mapping utilities
  - Call backend API
  - Estimated: 2 hours

- [ ] **Task 4.8.4**: Add help and version
  - Display help text
  - Show version
  - Estimated: 30 min

### 4.9 Error Handling & Reporting

- [ ] **Task 4.9.1**: Implement error handling
  - Catch and log errors
  - Continue processing on individual errors
  - Track error count
  - Estimated: 1.5 hours

- [ ] **Task 4.9.2**: Create sync summary report
  - Count: inserted, updated, deleted, errors
  - Display summary after sync
  - Option to output JSON report
  - Estimated: 1.5 hours

- [ ] **Task 4.9.3**: Add exit codes
  - 0: Success
  - 1: Errors occurred but sync completed
  - 2: Fatal error, sync aborted
  - Estimated: 30 min

### 4.10 Windows Integration

- [ ] **Task 4.10.1**: Create batch script launcher
  - Create `sync.bat` for double-click execution
  - Configure paths
  - Estimated: 30 min

- [ ] **Task 4.10.2**: Document installation
  - Write installation guide
  - Document configuration
  - Estimated: 1 hour

---

## EPIC 5: Auth & Permissions (Phase 2)

### 5.1 Discord OAuth Setup

- [ ] **Task 5.1.1**: Create Discord OAuth application
  - Go to Discord Developer Portal
  - Create new application
  - Get Client ID and Client Secret
  - Configure OAuth redirect URIs (e.g., `http://localhost:5173/auth/discord/callback`)
  - Save credentials securely
  - Estimated: 30 min

- [ ] **Task 5.1.2**: Set up Discord bot (optional, for role checking)
  - Create bot in Discord Developer Portal
  - Get bot token
  - Invite bot to Discord server with required permissions
  - Enable Server Members Intent (for role checking)
  - Estimated: 30 min

- [ ] **Task 5.1.3**: Install auth dependencies
  - @nestjs/passport, @nestjs/jwt
  - passport, passport-discord, passport-jwt
  - axios (for Discord API calls)
  - Estimated: 30 min

### 5.2 Backend Auth Implementation

- [ ] **Task 5.2.1**: Create User model in Prisma
  - Add User table: id, discordId (unique), username, avatar, discordRoles, createdAt, updatedAt
  - Create migration
  - Estimated: 1 hour

- [ ] **Task 5.2.2**: Create Discord strategy
  - Install and configure passport-discord
  - Create DiscordStrategy class
  - Handle OAuth callback
  - Fetch user info from Discord
  - Estimated: 2 hours

- [ ] **Task 5.2.3**: Create Discord service
  - Service to call Discord API
  - Method to get user info
  - Method to check user's server membership
  - Method to verify user has required role
  - Handle API errors and rate limits
  - Estimated: 2.5 hours

- [ ] **Task 5.2.4**: Create AuthModule
  - Set up Discord strategy
  - Configure JWT strategy
  - Set up JWT secret and options
  - Export AuthService
  - Estimated: 1.5 hours

- [ ] **Task 5.2.5**: Implement AuthService
  - Method to handle Discord OAuth callback
  - Verify user has required Discord role
  - Create or update user in database
  - Generate JWT token
  - Return user and token
  - Estimated: 2 hours

- [ ] **Task 5.2.6**: Create OAuth endpoints
  - GET /auth/discord - Initiate Discord OAuth
  - GET /auth/discord/callback - Handle OAuth callback
  - POST /auth/logout - Logout (invalidate token)
  - GET /auth/me - Get current user
  - Estimated: 2 hours

- [ ] **Task 5.2.7**: Create auth guards
  - JwtAuthGuard - Verify JWT token
  - Optional: RolesGuard - Check Discord roles (if needed)
  - Apply guards to song endpoints
  - Estimated: 2 hours

- [ ] **Task 5.2.8**: Add environment variables
  - DISCORD_CLIENT_ID
  - DISCORD_CLIENT_SECRET
  - DISCORD_CALLBACK_URL
  - DISCORD_GUILD_ID (server ID)
  - DISCORD_REQUIRED_ROLE_ID
  - JWT_SECRET
  - Estimated: 30 min

### 5.3 Frontend Auth Implementation

- [ ] **Task 5.3.1**: Create auth context/provider
  - AuthProvider component
  - Store user state and token
  - Provide auth methods (login, logout, checkAuth)
  - Handle token refresh if needed
  - Estimated: 2 hours

- [ ] **Task 5.3.2**: Create login page
  - "Login with Discord" button
  - Redirect to backend OAuth endpoint
  - Handle OAuth callback
  - Store JWT token (httpOnly cookie or localStorage)
  - Redirect to app on success
  - Estimated: 2 hours

- [ ] **Task 5.3.3**: Create user profile component
  - Display Discord username and avatar
  - Show Discord roles
  - Logout button
  - Estimated: 1.5 hours

- [ ] **Task 5.3.4**: Add protected routes
  - RequireAuth component/HOC
  - Redirect to login if not authenticated
  - Show loading state during auth check
  - Estimated: 1.5 hours

- [x] **Task 5.3.5**: Update API client for auth
  - [x] Add JWT token to requests (Authorization header) - **COMPLETED**: Token automatically included in all API requests via `apps/web/src/services/api.ts`
  - [ ] Handle 401 errors (redirect to login) - **PENDING**: Currently shows error, could redirect to login
  - [ ] Refresh token if needed - **PENDING**: Not implemented (re-authentication required)
  - Estimated: 1.5 hours

- [ ] **Task 5.3.6**: Add logout functionality
  - Call logout endpoint
  - Clear token and user state
  - Redirect to login
  - Estimated: 1 hour

- [ ] **Task 5.3.7**: Handle unauthorized users
  - Show message if user doesn't have required Discord role
  - Provide instructions on how to get access
  - Estimated: 1 hour

### 5.4 Error Handling & Edge Cases

- [ ] **Task 5.4.1**: Handle Discord API errors
  - Rate limiting
  - API downtime
  - Invalid tokens
  - Estimated: 1.5 hours

- [ ] **Task 5.4.2**: Handle role changes
  - User loses role in Discord
  - Re-verify roles on token refresh (optional)
  - Handle unauthorized access gracefully
  - Estimated: 1.5 hours

- [ ] **Task 5.4.3**: Add token refresh mechanism (optional)
  - Refresh JWT before expiration
  - Or re-authenticate with Discord
  - Estimated: 2 hours

---

## EPIC 6: Deployment & Environment

### 6.1 Docker Setup

- [ ] **Task 6.1.1**: Create Dockerfile for NestJS backend
  - Multi-stage build (dependencies → build → production)
  - Use Node.js Alpine image for smaller size
  - Copy package files and install dependencies
  - Build application
  - Expose port 3000
  - Set up health check
  - Estimated: 2 hours

- [ ] **Task 6.1.2**: Create Dockerfile for React frontend
  - Multi-stage build (build → nginx serve)
  - Build React app with Vite
  - Use nginx to serve static files
  - Configure nginx for SPA routing
  - Expose port 80
  - Estimated: 1.5 hours

- [x] **Task 6.1.3**: Create docker-compose.yml for development
  - PostgreSQL service with volume for data persistence
  - NestJS backend service with hot reload
  - React frontend service with hot reload
  - Environment variables from .env files
  - Network configuration
  - Volume mounts for code (development)
  - Estimated: 2 hours
  - **Completed**: 2025-01-22 - Created `docker-compose.dev.yml` for development with MongoDB in Docker, API and Web running locally for hot-reloading

- [ ] **Task 6.1.4**: Create docker-compose.prod.yml for production
  - PostgreSQL service with named volume
  - NestJS backend service (production build)
  - React frontend service (production build)
  - Environment variables configuration
  - Restart policies
  - Health checks
  - Estimated: 2 hours

- [ ] **Task 6.1.5**: Create .dockerignore files
  - Backend .dockerignore (node_modules, dist, etc.)
  - Frontend .dockerignore (node_modules, dist, etc.)
  - Estimated: 30 min

- [ ] **Task 6.1.6**: Add Docker documentation
  - Development setup instructions
  - Production deployment guide
  - Common Docker commands
  - Troubleshooting guide
  - Estimated: 1.5 hours

### 6.2 Backend Deployment

- [ ] **Task 6.2.1**: Create production Dockerfile
  - Multi-stage build
  - Optimize image size
  - Estimated: 1.5 hours (if not using Docker)

- [ ] **Task 6.2.2**: Set up production environment config
  - Production .env template
  - Database connection
  - CORS settings
  - Docker environment variables
  - Estimated: 1 hour

- [ ] **Task 6.2.3**: Add health check endpoint
  - GET /health
  - Check database connection
  - Estimated: 45 min

- [ ] **Task 6.2.4**: Set up production logging
  - Configure Winston for production
  - Log to file/system
  - Estimated: 1 hour

### 6.3 Frontend Deployment

- [ ] **Task 6.3.1**: Optimize production build
  - Configure Vite for production
  - Optimize bundle size
  - Estimated: 1 hour

- [ ] **Task 6.3.2**: Set up static hosting (alternative to Docker)
  - Configure for Vercel/Netlify
  - Set environment variables
  - Estimated: 1 hour

### 6.4 Documentation

- [ ] **Task 6.3.1**: Write main README
  - Project overview
  - Setup instructions
  - Development guide
  - Estimated: 2 hours

- [ ] **Task 6.3.2**: Write API documentation
  - Document all endpoints
  - Request/response examples
  - Estimated: 2 hours

- [ ] **Task 6.3.3**: Write user guide
  - How to use frontend
  - How to run sync tool
  - Estimated: 1.5 hours

- [ ] **Task 6.3.4**: Write deployment guide
  - Backend deployment steps
  - Frontend deployment steps
  - Database setup
  - Estimated: 2 hours

---

## Summary

**Total Estimated Tasks**: ~230 tasks
**Estimated Total Time**: ~470-570 hours (12-14 weeks for one developer)

**MVP Scope (Phase 1)**:

- Epic 1: Complete
- Epic 2: Complete (core CRUD)
- Epic 3: Complete (core features)
- Epic 4: Complete (one-way sync)

**Phase 2**:

- Epic 5: Auth & Permissions
- Epic 6: Production Deployment

---

**Last Updated**: 2025-01-22
**Next Review**: After Epic 3 completion

## Recent Accomplishments (2025-01-22)

### Frontend Verse Management
- ✅ Implemented comprehensive verse parsing from XML format (OpenLP) and plain string format
- ✅ Created `verseParser.ts` utility with functions for parsing, combining, and managing verses
- ✅ Added individual verse editing boxes in SongForm (add, delete, reorder, change type)
- ✅ Implemented verse order management with editable string input (e.g., "v1 c1 v2 c1")
- ✅ Fixed async form data loading with useEffect hook to reset form when song data loads
- ✅ Removed unnecessary fields from SongForm (Chorus, Tags, Number) per user request
- ✅ Updated SongDetailPage to properly display parsed verses with order information
- ✅ Added support for repeating verses in verse order string

### Notification System
- ✅ Created global NotificationContext with Material UI Snackbar
- ✅ Integrated success/error notifications across all pages
- ✅ Top-center positioning with 3-second auto-dismiss
- ✅ Used in SongCreatePage, SongEditPage, and SongDetailPage

### UI/UX Improvements
- ✅ Implemented responsive design for mobile devices
- ✅ Added fullscreen/normal view toggle for SongDetailPage
- ✅ Created left-hand search column with song list (hidden on mobile)
- ✅ Implemented debounced search (300ms delay)
- ✅ Auto-scroll to selected song in search list
- ✅ Current song highlighted (bold) in search list
- ✅ Optimized React Query to prevent page blinks during navigation
- ✅ Used React Router Link for smooth client-side navigation
- ✅ Fixed mobile page overflow issues
- ✅ Responsive button layouts (stack on mobile, row on desktop)

### Testing Infrastructure
- ✅ Migrated sync package from Jest to Vitest
- ✅ Created comprehensive unit tests for SyncService
- ✅ Created comprehensive unit tests for ApiClientService
- ✅ All tests passing with Vitest

### Development Environment
- ✅ Set up Docker Compose for development (MongoDB in Docker, API/Web locally)
- ✅ Configured hot-reloading for local development
- ✅ Updated environment variable examples for Docker setup

### API Updates
- ✅ Increased default song list limit from 20 to 150
- ✅ Updated query DTOs with new default limit
