You are a senior full-stack architect and project planner.  
Your job: take the description below and break it down into a clean, modern 2025-style plan for a monorepo app, with tasks for both backend (NestJS) and frontend (React + Vite), plus a separate sync tool.

PROJECT CONTEXT (REAL WORLD)

- Church setup:
  - There is a Windows PC in the church that runs OpenLP (song/projection software).
  - OpenLP keeps its songs database in a local SQLite file (e.g. songs.sqlite).
  - Right now, this database is edited manually / statically inside OpenLP.

- Goal:
  - I want a **web application** where several people can use their phones / browsers to **add and edit songs**.
  - The **NestJS backend database** will be the **single source of truth** for all songs.
  - A separate **sync program** will periodically synchronize the NestJS database with the OpenLP SQLite database on the church computer.
  - On Sundays we want to sync the latest songs from the backend into the OpenLP database, so OpenLP always has the newest data.

- Core idea:
  - **Backend DB (NestJS)** = canonical source of truth.
  - **OpenLP SQLite DB** = local replica, only used for projection during services.
  - Users never edit songs directly in OpenLP, only in the web app.

TECH STACK EXPECTATIONS

- Monorepo:
  - Use **pnpm workspaces**.
  - Structure like:
    - `apps/web` – React + Vite + TypeScript
    - `apps/api` – NestJS (latest stable, 2025 ready)
    - `apps/sync` – Node.js CLI tool for syncing OpenLP SQLite <-> Nest API
    - (optionally) `packages/shared` for shared types / DTOs

- Frontend:
  - React 18 + Vite + TypeScript
  - Simple, mobile-friendly UI (for phones)
  - Core screens:
    - Song list with search & filters
    - Song details + edit form
    - Add new song
  - Basic validation and good UX for editing verses (stanzas), chorus, etc.

- Backend:
  - NestJS with TypeScript.
  - Use a relational DB, preferably PostgreSQL (but for planning you can say "relational DB, most likely Postgres").
  - Use an ORM (Prisma or TypeORM – choose one and stay consistent).
  - Expose a REST API (or REST + maybe later GraphQL) to manage songs.
  - Implement CRUD operations:
    - Create / read / update / delete songs
    - List songs with filters/search and pagination
  - Define a **song model** roughly like:
    - `id`
    - `title`
    - `number` (optional, hymnbook number)
    - `language`
    - `verses` (with order)
    - `chorus` (optional)
    - `tags` or `categories`
    - `createdAt`, `updatedAt`
  - Plan for **import/export mapping** between this model and the OpenLP SQLite schema.

- Sync tool (`apps/sync`):
  - Node.js CLI app (TypeScript).
  - It will run on the church PC (the same one that runs OpenLP).
  - Responsibilities:
    - Read the local OpenLP SQLite database file.
    - Talk to the NestJS backend over HTTP (REST API).
    - Perform **one-way sync** from backend → OpenLP:
      - Fetch all songs (or only changed ones) from NestJS API.
      - Update/replace the corresponding records in the OpenLP SQLite DB.
    - Optionally, plan for future two-way sync (but phase 1 can be one-way).
  - It should be designed to be run manually before services (e.g. double-click or command in terminal), or scheduled.

REQUIREMENTS FOR YOU (CURSOR)

1. **Break the project into epics and tasks**
   - Create a clear hierarchy, e.g.:
     - Epic 1: Monorepo & tooling setup
     - Epic 2: Backend API & database
     - Epic 3: Frontend application
     - Epic 4: OpenLP sync tool
     - Epic 5: Auth & permissions (optional/phase 2)
     - Epic 6: Deployment / environment
   - For each epic, list concrete developer tasks that can be executed in small steps (1–2 hours each).
   - Focus on a realistic first version (MVP) that can be used in the church.

2. **Monorepo and folder structure**
   - Propose an initial monorepo structure with `apps/` and `packages/`.
   - Show example `pnpm-workspace.yaml`, root `package.json` scripts, and explain how dev flows will look (e.g. `pnpm dev:web`, `pnpm dev:api`).
   - Suggest minimal shared types package (`packages/shared`) for DTOs and domain types used by both Nest and React.

3. **Backend design**
   - Define the main NestJS modules and folders:
     - e.g. `SongModule` with `song.controller.ts`, `song.service.ts`, `song.entity.ts` or Prisma model, DTOs, etc.
   - Define main REST endpoints for songs:
     - `GET /songs`, `GET /songs/:id`, `POST /songs`, `PATCH /songs/:id`, `DELETE /songs/:id`, `GET /songs/search`
   - Suggest how to structure the DTOs and validation with class-validator.
   - Plan integration with a relational DB (migrations, seeding initial data, etc.).
   - Plan how to **import existing OpenLP database** into the NestJS DB for the first time (one-time migration script).

4. **OpenLP SQLite schema and mapping**
   - Assume we can inspect the OpenLP SQLite schema.
   - Describe how to map the OpenLP song structure to our NestJS song model.
   - Plan how to keep IDs stable (so that sync works reliably).
   - Propose a simple strategy where backend IDs become canonical, and OpenLP database stores a foreign key/reference to them if needed.

5. **Sync tool design (`apps/sync`)**
   - Describe architecture of the Node CLI:
     - config file (e.g. path to OpenLP DB file, Nest API URL, API key/token)
     - services for:
       - reading/writing SQLite
       - calling NestJS API
       - reconciliation logic (what to insert/update/delete)
     - logging and simple "dry-run" mode (optional but nice).
   - Break down tasks to:
     - set up TS CLI project
     - implement SQLite access layer
     - implement HTTP client to NestJS API
     - implement sync algorithm (one-way backend → OpenLP, for MVP)
     - basic error handling and reporting.

6. **Frontend design**
   - Propose the main React routes/pages:
     - `/` – list of songs with search
     - `/songs/new` – create song
     - `/songs/:id` – view & edit song
   - Suggest reusable components:
     - `SongForm` with verse editor
     - `VerseList`, `VerseEditor`, etc.
   - Define how the frontend will communicate with the Nest API (REST + fetch/axios, with a small API client wrapper).
   - Include validation and basic error display.

7. **Auth & roles (Phase 2, optional)**
   - Propose a simple auth model for later:
     - minimal login (e.g. shared password or simple accounts)
     - role: regular editor vs admin
   - Only plan tasks, do not go deep into implementation now (unless there is enough space).

8. **Deliverables format**
   - Please respond with:
     - A list of EPICS (with descriptions).
     - For each EPIC, a numbered list of TASKS (developer-oriented, small).
     - Any recommended folder structures and config snippets.
   - Optimize for clarity and practical implementation. Tasks should be easy to paste into an issue tracker.

If something is ambiguous, make reasonable assumptions and state them explicitly in your plan, instead of asking me questions.
