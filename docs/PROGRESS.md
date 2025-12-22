# Project Progress - OpenLP Database Sync

**Last Updated**: 2025-11-24  
**Status**: Phase 1 (MVP) feature-complete; polishing, auth edge cases, and deployment hardening underway.

---

## Snapshot

- ✅ Backend (NestJS + MongoDB/Mongoose) delivers full CRUD, audit logging, Discord-authenticated editing, throttling, ZIP export, and OpenLP import tooling.
- ✅ Frontend (React 18 + Vite + MUI) provides end-to-end song management with verse parsing, order editing, notifications, auth-aware routing, and responsive layout.
- ✅ Sync CLI performs one-way backend → OpenLP reconciliation with dry-run, detailed logging, and Vitest coverage.
- ✅ Docker dev/prod workflows finalized; docs updated across architecture, rules, context, and Docker guides.
- 🔄 Phase 2 Discord auth UX refinements, Swagger docs, and production seeding still open.

---

## ✅ Completed Highlights (since 2025-01-22)

### Backend

- Migrated to MongoDB/Mongoose with `DatabaseModule`, schema indexes, and health reporting.
- Song service/controller upgraded with search, pagination, soft deletes, tag lookups, and ZIP export guarded by throttling + audit logs.
- Discord OAuth stack completed (strategies, guards, audit logs, dev login, detailed troubleshooting logs).
- OpenLP migration script (`src/scripts/migrate-openlp.ts`) parses XML lyrics, preserves verse order, and imports metadata.
- Rate limiting (ThrottlerGuard), Helmet, body-size enforcement, and multi-origin CORS in `main.ts`.

### Frontend

- Comprehensive `SongForm`, verse order editor, XML/string parsing utilities, and notifications context.
- Auth-aware layout (Navbar avatar menu, ProtectedRoute/AdminRoute, login callback flow, settings dialog).
- Song list/search sidebar with debounced queries, responsive layout, and sticky navigation.
- Delete confirmation flows, ZIP export, React Query cache orchestration, and Snackbar-based toasts.

### Sync Tool

- Commander CLI (`sync`, `sync-song`, `list`) with dry-run/verbose modes, change summaries, and exit codes.
- Services for API + OpenLP DB, reconciliation logic with UUID comments, and map utilities.
- Vitest suites covering sync logic, API client, and SQLite service.

### DevEx & Docs

- Docker Compose (dev + prod) uses MongoDB, health checks, and environment overrides.
- Documentation refreshed: PROJECT_PLAN (Mongo), CONTEXT, DETAILED_TODO (new snapshot), ARCHITECTURE, DISCORD_AUTH_SETUP.

---

## In Progress / Next Up

1. **Backend polish**
   - Add global HTTP exception filter + custom exceptions for consistent error payloads.
   - Publish Swagger/OpenAPI docs after annotating controllers/DTOs.
   - Seed script for curated demo data + instructions (`pnpm seed:api`).
2. **Frontend UX**
   - ErrorBoundary + offline/retry banner for fetch failures.
   - Formal mobile QA (device screenshots, touch tweaks) and improved audit log filters.
3. **Sync Tool DX**
   - Windows `sync.bat` launcher + installation walkthrough for church PC.
   - Optional `import` command (OpenLP → backend) for legacy migrations.
4. **Auth Edge Cases**
   - Better messaging for users lacking Discord role, auto-logout on 401, optional token refresh.
5. **Deployment**
   - Production `.env` templates, monitoring plan leveraging existing `/health`, and CI pipeline for lint/test/build.

---

## Epic Status Overview

| Epic                  | Status | Notes                                                         |
| --------------------- | ------ | ------------------------------------------------------------- |
| 1. Monorepo & Tooling | ✅     | Workspace, shared package, linting stable.                    |
| 2. Backend API & DB   | ���    | Feature-complete; needs Swagger, seed data, exception filter. |
| 3. Frontend App       | ���    | Core UX done; polish (error boundary/mobile QA) pending.      |
| 4. Sync Tool          | ���    | CLI + tests ready; packaging/docs still queued.               |
| 5. Auth & Permissions | ���    | Discord OAuth live; UX + token refresh outstanding.           |
| 6. Deployment & Env   | ���    | Docker + docs done; CI + prod checklist still open.           |

---

## ��� Build & Test Matrix

| Target             | Command                   | Status              |
| ------------------ | ------------------------- | ------------------- |
| Backend dev        | `pnpm dev:api`            | ✅                  |
| Backend unit tests | `pnpm test:api`           | ✅ (Mongoose mocks) |
| Frontend dev       | `pnpm dev:web`            | ✅                  |
| Frontend build     | `pnpm build:web`          | ✅                  |
| Sync tests         | `pnpm test:sync`          | ✅ (Vitest)         |
| Docker dev         | `docker-compose.dev.yml`  | ✅                  |
| Docker prod        | `docker-compose.prod.yml` | ✅                  |

---

## ��� Key Artifacts

- `docs/DETAILED_TODO.md` – up-to-date actionable backlog with remaining tasks flagged.
- `docs/ARCHITECTURE.md` – Mongo/Mongoose centric architecture diagram and security posture.
- `docs/DISCORD_AUTH_SETUP.md` – instructions for bot permissions, troubleshooting, and environment variables.
- `apps/api/src/scripts/migrate-openlp.ts` – run once to import historical OpenLP database.
- `apps/sync/README.md` – CLI usage, dry-run, and sample `.env` values.

---

## ��� Guidance for Contributors

1. Review `docs/DETAILED_TODO.md` → pick the next unchecked item within the relevant epic.
2. Cross-reference `docs/PROJECT_RULES.md` before coding (naming, testing, logging expectations).
3. Update this progress file + TODO checklist after merging meaningful work.
4. Surface new architecture decisions in `docs/ADRs.md` when they impact deployment, data flow, or tech stack.
