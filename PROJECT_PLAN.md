# OpenLP Database Sync - Project Plan

**Repository**: [https://github.com/doszyja/openlp-remote-database](https://github.com/doszyja/openlp-remote-database)

## Overview

This project creates a web-based song management system for churches using OpenLP. The system consists of:

- **Backend (NestJS)**: Single source of truth for all songs
- **Frontend (React + Vite)**: Mobile-friendly web app for editing songs
- **Sync Tool (Node CLI)**: Synchronizes backend database with OpenLP SQLite database

---

## EPIC 1: Monorepo & Tooling Setup

**Goal**: Establish the monorepo foundation with pnpm workspaces and development tooling.

### Tasks

1. **Initialize pnpm workspace**
   - Create `pnpm-workspace.yaml` with apps and packages
   - Set up root `package.json` with workspace scripts
   - Configure TypeScript root config

2. **Set up shared types package (`packages/shared`)**
   - Initialize TypeScript package
   - Create base song DTOs and types
   - Export shared interfaces for frontend/backend communication
   - Set up package build configuration

3. **Configure development tooling**
   - Add ESLint and Prettier configs (root level)
   - Set up Husky for git hooks (optional)
   - Configure VS Code workspace settings (optional)
   - Add `.gitignore` for monorepo

4. **Set up environment configuration**
   - Create `.env.example` files for each app
   - Document environment variables needed
   - Set up dotenv handling

---

## EPIC 2: Backend API & Database

**Goal**: Build the NestJS REST API with PostgreSQL database as the single source of truth.

### Database Design

**Song Model** (using Prisma):

- `id` (UUID, primary key)
- `title` (string, required)
- `number` (string, optional - hymnbook number)
- `language` (string, default: 'en')
- `chorus` (text, optional)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `tags` (many-to-many relationship with Tag model)
- `verses` (one-to-many relationship with Verse model)

**Verse Model**:

- `id` (UUID, primary key)
- `songId` (UUID, foreign key)
- `order` (integer, required - for verse ordering)
- `content` (text, required)
- `label` (string, optional - e.g., "Verse 1", "Bridge")

**Tag Model**:

- `id` (UUID, primary key)
- `name` (string, unique, required)
- `songs` (many-to-many relationship)

**OpenLP Mapping Table** (for sync tracking):

- `id` (UUID, primary key)
- `songId` (UUID, foreign key to Song)
- `openlpId` (integer, nullable - OpenLP's internal ID)
- `lastSyncedAt` (DateTime, nullable)

### Tasks

1. **Initialize NestJS application (`apps/api`)**
   - Create NestJS project with CLI
   - Configure TypeScript and build settings
   - Set up Prisma as ORM
   - Configure environment variables

2. **Set up Prisma schema and database**
   - Define Prisma schema with Song, Verse, Tag models
   - Configure PostgreSQL connection
   - Set up Prisma client generation
   - Create initial migration

3. **Create Prisma module and service**
   - Implement `PrismaModule` for dependency injection
   - Create `PrismaService` with lifecycle hooks
   - Add database connection handling

4. **Implement Song module structure**
   - Create `SongModule`
   - Set up `SongController` with REST endpoints
   - Create `SongService` with business logic
   - Implement DTOs with class-validator

5. **Implement REST endpoints - GET operations**
   - `GET /songs` - List songs with pagination, filters, search
   - `GET /songs/:id` - Get single song by ID
   - `GET /songs/search?q=...` - Search songs by title/content
   - Add query DTOs for filtering (language, tags, etc.)

6. **Implement REST endpoints - POST operation**
   - `POST /songs` - Create new song
   - Validate request body with CreateSongDto
   - Handle verses and tags creation
   - Return created song with relations

7. **Implement REST endpoints - PATCH operation**
   - `PATCH /songs/:id` - Update existing song
   - Validate request body with UpdateSongDto
   - Handle partial updates (verses, tags)
   - Return updated song

8. **Implement REST endpoints - DELETE operation**
   - `DELETE /songs/:id` - Delete song
   - Handle cascade deletion of verses
   - Remove tag associations
   - Return success response

9. **Add error handling and validation**
   - Implement global exception filter
   - Add validation pipes
   - Create custom error responses
   - Handle Prisma errors (not found, unique constraints)

10. **Create OpenLP import script (one-time migration)**
    - Create CLI script to read OpenLP SQLite database
    - Map OpenLP schema to our Song model
    - Import songs, verses, and metadata
    - Store OpenLP IDs in mapping table
    - Add error handling and progress logging

11. **Add database seeding**
    - Create seed script with sample songs
    - Add command to package.json
    - Document seeding process

12. **Set up CORS for frontend**
    - Configure CORS middleware
    - Allow frontend origin
    - Set appropriate headers

13. **Add API documentation (Swagger/OpenAPI)**
    - Install and configure Swagger
    - Add decorators to controllers
    - Generate API documentation
    - Document DTOs and responses

---

## EPIC 3: Frontend Application

**Goal**: Build a mobile-friendly React web application for managing songs.

### Component Structure

```
apps/web/
├── src/
│   ├── components/
│   │   ├── SongList.tsx
│   │   ├── SongCard.tsx
│   │   ├── SongForm.tsx
│   │   ├── VerseEditor.tsx
│   │   ├── VerseList.tsx
│   │   ├── SearchBar.tsx
│   │   ├── FilterBar.tsx
│   │   └── ErrorDisplay.tsx
│   ├── pages/
│   │   ├── SongListPage.tsx
│   │   ├── SongDetailPage.tsx
│   │   └── SongCreatePage.tsx
│   ├── services/
│   │   └── api.ts (API client wrapper)
│   ├── hooks/
│   │   ├── useSongs.ts
│   │   └── useSong.ts
│   ├── types/
│   │   └── song.ts (re-export from @openlp/shared)
│   └── App.tsx
```

### Tasks

1. **Initialize React + Vite project (`apps/web`)**
   - Create Vite project with React + TypeScript template
   - Configure path aliases
   - Set up environment variables
   - Install dependencies (React Router, axios/fetch wrapper)

2. **Set up routing**
   - Install React Router v6
   - Create route structure:
     - `/` - Song list page
     - `/songs/new` - Create song page
     - `/songs/:id` - Song detail/edit page
   - Add navigation component

3. **Create API client service**
   - Implement API client wrapper (using fetch or axios)
   - Define base URL from environment
   - Add request/response interceptors
   - Handle errors and transform responses
   - Type with shared DTOs

4. **Create custom hooks for data fetching**
   - `useSongs` - Fetch song list with filters
   - `useSong` - Fetch single song by ID
   - Use React Query or SWR (or simple useState/useEffect)
   - Handle loading and error states

5. **Build SongList component**
   - Display list of songs with cards
   - Show title, language, tags preview
   - Add click handler to navigate to detail
   - Implement loading skeleton

6. **Build SearchBar component**
   - Text input for search query
   - Debounce search input
   - Trigger API search call
   - Display search results

7. **Build FilterBar component**
   - Filter by language (dropdown)
   - Filter by tags (multi-select)
   - Clear filters button
   - Update URL query params

8. **Build SongCard component**
   - Display song title, number, language
   - Show tags as chips/badges
   - Show verse count or preview
   - Add edit/delete actions (icons)

9. **Build SongForm component**
   - Form fields: title, number, language
   - Chorus textarea
   - Tags input (autocomplete or multi-select)
   - Verse management section
   - Form validation with error messages
   - Submit handler

10. **Build VerseEditor component**
    - Textarea for verse content
    - Optional label input (e.g., "Verse 1", "Bridge")
    - Order indicator
    - Add/remove verse buttons
    - Drag-and-drop reordering (optional, nice-to-have)

11. **Build VerseList component**
    - Display list of verses in order
    - Show verse labels and content
    - Allow inline editing or edit mode
    - Reorder functionality

12. **Build SongDetailPage**
    - Fetch song by ID from route param
    - Display song details (read-only view)
    - Edit button to switch to edit mode
    - Use SongForm in edit mode
    - Handle save and cancel actions

13. **Build SongCreatePage**
    - Use SongForm component
    - Initialize empty form
    - Handle form submission
    - Navigate to detail page on success
    - Show success/error messages

14. **Build SongListPage**
    - Combine SongList, SearchBar, FilterBar
    - Handle pagination (if needed)
    - Add "Create New Song" button
    - Manage loading and error states

15. **Add mobile-responsive styling**
    - Use Material UI (MUI) for components and styling
    - Ensure touch-friendly buttons and inputs
    - Responsive layout for phone screens
    - Test on mobile viewport

16. **Add error handling and user feedback**
    - Display API errors to user
    - Show success messages on create/update
    - Add loading indicators
    - Handle network errors gracefully

17. **Add form validation**
    - Client-side validation for required fields
    - Validate verse content not empty
    - Show validation errors inline
    - Prevent submission if invalid

18. **Optimize for mobile UX**
    - Large touch targets
    - Sticky search/filter bar
    - Bottom navigation (optional)
    - Swipe gestures (optional)

---

## EPIC 4: OpenLP Sync Tool

**Goal**: Create a CLI tool that synchronizes the NestJS backend database with the OpenLP SQLite database.

### Architecture

```
apps/sync/
├── src/
│   ├── config/
│   │   └── config.ts (load from config file or env)
│   ├── services/
│   │   ├── openlp-db.service.ts (SQLite operations)
│   │   ├── api-client.service.ts (NestJS API calls)
│   │   └── sync.service.ts (reconciliation logic)
│   ├── utils/
│   │   ├── logger.ts
│   │   └── mapper.ts (OpenLP <-> Backend mapping)
│   └── index.ts (CLI entry point)
```

### OpenLP Schema Assumptions

Based on typical OpenLP SQLite structure:

- `songs` table: `id`, `title`, `copyright`, `comments`, etc.
- `song_verses` table: `song_id`, `verse_order`, `verse_text`, `verse_type` (verse/chorus)
- `song_books` table: book references (optional)

**Mapping Strategy**:

- Backend UUIDs stored in OpenLP `songs.comments` or custom field as JSON metadata
- Or: Create mapping table in OpenLP (if we can modify schema)
- Or: Use OpenLP's `id` and maintain bidirectional mapping in backend

### Tasks

1. **Initialize Node.js CLI project (`apps/sync`)**
   - Create TypeScript Node.js project
   - Set up build configuration
   - Install dependencies (better-sqlite3, axios, commander for CLI)
   - Configure entry point

2. **Create configuration system**
   - Define config interface (OpenLP DB path, API URL, API key)
   - Support config file (JSON or YAML)
   - Support environment variables
   - Add config validation
   - Create example config file

3. **Implement OpenLP database service**
   - Install better-sqlite3 for SQLite access
   - Create `OpenLPDbService` class
   - Methods: `getAllSongs()`, `getSongById()`, `insertSong()`, `updateSong()`, `deleteSong()`
   - Handle SQLite connection and errors
   - Map OpenLP schema to internal model

4. **Implement API client service**
   - Create `ApiClientService` class
   - Methods: `getAllSongs()`, `getSongById()`, `getChangedSongs(since)`
   - Handle HTTP errors and retries
   - Add authentication (API key/token)
   - Type responses with shared types

5. **Create mapping utilities**
   - Implement `mapBackendToOpenLP()` function
   - Implement `mapOpenLPToBackend()` function (for import)
   - Handle verse ordering and types
   - Map tags/categories
   - Handle missing fields gracefully

6. **Implement sync service (one-way: backend → OpenLP)**
   - Create `SyncService` class
   - Algorithm:
     - Fetch all songs from backend API
     - Read existing songs from OpenLP DB
     - Compare and determine: insert, update, delete
     - Execute changes in OpenLP DB
   - Handle ID mapping (backend UUID to OpenLP integer)
   - Store mapping in OpenLP (comments field or separate table)

7. **Add dry-run mode**
   - Add `--dry-run` CLI flag
   - Show what would be changed without writing
   - Display summary: X to insert, Y to update, Z to delete
   - Exit without making changes

8. **Implement logging**
   - Add logger utility (winston or simple console)
   - Log sync progress and results
   - Log errors with context
   - Option to write log file

9. **Add CLI interface**
   - Use commander.js or similar
   - Commands: `sync`, `import` (one-time OpenLP → backend)
   - Options: `--config`, `--dry-run`, `--verbose`
   - Display help and version

10. **Add error handling**
    - Handle network errors (API unavailable)
    - Handle database errors (SQLite locked, file not found)
    - Handle mapping errors (invalid data)
    - Provide clear error messages
    - Exit with appropriate codes

11. **Add sync summary reporting**
    - Display sync statistics after completion
    - Show: songs synced, errors encountered
    - Option to output JSON report

12. **Create Windows-friendly launcher (optional)**
    - Create `.bat` script for double-click execution
    - Or create simple GUI wrapper (Electron, optional)
    - Document manual and scheduled execution

---

## EPIC 5: Auth & Permissions (Phase 2 - Optional)

**Goal**: Add Discord OAuth authentication with role-based access control.

### Authentication Strategy

- **Discord OAuth 2.0**: Users authenticate via Discord
- **Role-Based Access**: Only users with specific Discord server role can access
- **JWT Tokens**: Backend issues JWT tokens after Discord authentication
- **Session Management**: Store JWT in httpOnly cookies (recommended) or localStorage

### Discord Integration Requirements

- Discord OAuth App setup (Client ID, Client Secret)
- Discord Bot with server member intent (to check roles)
- Specific Discord role ID for authorized users
- OAuth redirect URI configuration

### Tasks

1. **Design auth model**
   - User model: id, discordId, username, avatar, roles (from Discord), createdAt
   - Store Discord user info in database
   - JWT payload: userId, discordId, roles
   - No password storage (Discord handles authentication)

2. **Set up Discord OAuth application**
   - Create Discord application in Discord Developer Portal
   - Configure OAuth redirect URIs
   - Get Client ID and Client Secret
   - Set up Discord bot (optional, for role checking)

3. **Implement backend Discord OAuth**
   - Install @nestjs/passport, passport-discord, @nestjs/jwt
   - Create AuthModule with Discord strategy
   - Implement OAuth callback endpoint
   - Verify user has required Discord server role
   - Create/update user in database
   - Issue JWT token after successful authentication
   - Add guards to protect song endpoints

4. **Implement Discord role verification**
   - Create service to check Discord server membership
   - Verify user has required role in Discord server
   - Use Discord API or bot to check roles
   - Handle unauthorized users (no role)

5. **Implement frontend Discord auth**
   - Create login page with "Login with Discord" button
   - Redirect to Discord OAuth
   - Handle OAuth callback
   - Store JWT token (httpOnly cookie recommended)
   - Add auth context/provider
   - Protect routes with auth check
   - Display user info (Discord username, avatar)
   - Add logout functionality

6. **Add user management (optional)**
   - Display list of authorized users
   - Show Discord info (username, avatar, roles)
   - Admin can manually add/remove users (if needed)

---

## EPIC 6: Deployment & Environment

**Goal**: Prepare the application for production deployment.

### Tasks

1. **Backend deployment preparation**
   - Add production environment config
   - Set up database migrations for production
   - Configure CORS for production domain
   - Add health check endpoint
   - Set up logging (Winston or similar)

2. **Frontend deployment preparation**
   - Configure production build
   - Set up environment variables for API URL
   - Optimize bundle size
   - Add build scripts

3. **Sync tool packaging**
   - Create standalone executable (optional, using pkg or similar)
   - Document installation on Windows PC
   - Create installation guide

4. **Documentation**
   - Write README for each app
   - Document API endpoints
   - Create user guide for frontend
   - Document sync tool usage
   - Add deployment guide

5. **Docker setup**
   - Create multi-stage Dockerfile for NestJS backend
   - Create Dockerfile for React frontend (production build)
   - Create docker-compose.yml for local development with:
     - PostgreSQL database service
     - NestJS backend service
     - React frontend service
     - Volume mounts for development
     - Environment variable configuration
   - Create docker-compose.prod.yml for production deployment
   - Add .dockerignore files
   - Document Docker usage for development and production
   - Add health checks and restart policies

---

## Assumptions & Decisions

1. **ORM Choice**: Using **Prisma** (modern, type-safe, excellent DX)
2. **Database**: **PostgreSQL** (production-ready, but can use SQLite for development)
3. **OpenLP Schema**: We'll inspect the actual OpenLP SQLite schema during implementation and adjust mapping accordingly
4. **ID Strategy**: Backend uses UUIDs; OpenLP uses integers. We'll store backend UUID in OpenLP's `comments` field as JSON metadata, or maintain a separate mapping table
5. **Sync Direction**: MVP is one-way (backend → OpenLP). Two-way sync can be added later
6. **Auth**: Phase 2 feature. MVP can work without auth (or with simple shared password)
7. **Frontend State Management**: Using React Query or SWR for server state, React Context for auth (if needed)
8. **Styling**: Using Material UI (MUI) for components and mobile-friendly UI development

---

## MVP Scope (Phase 1)

Focus on these epics for the first usable version:

- ✅ Epic 1: Monorepo & Tooling Setup
- ✅ Epic 2: Backend API & Database (core CRUD)
- ✅ Epic 3: Frontend Application (core features)
- ✅ Epic 4: OpenLP Sync Tool (one-way sync)

Defer to Phase 2:

- Epic 5: Auth & Permissions
- Epic 6: Deployment (basic deployment only for MVP)

---

## Next Steps

1. Start with Epic 1 to set up the monorepo foundation
2. Move to Epic 2 to build the backend API
3. Build Epic 3 frontend in parallel once API endpoints are ready
4. Implement Epic 4 sync tool after backend is stable
5. Test end-to-end workflow: create song in frontend → sync to OpenLP
