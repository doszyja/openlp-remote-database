# Context & Background Information

This document provides essential context for maintaining and developing the OpenLP Database Sync project.

## Project Purpose

This project enables collaborative song management for churches using OpenLP projection software. The system allows multiple users to edit songs via a web application, with automatic synchronization to the OpenLP database used during church services.

## Key Concepts

### OpenLP

- **What it is**: Open-source church presentation software
- **Database**: Uses SQLite database (`songs.sqlite`) to store songs
- **Current workflow**: Songs are edited directly in OpenLP application
- **Problem**: Only one person can edit at a time, no collaboration

### Our Solution

- **Web App**: Multiple users can edit songs simultaneously from phones/browsers
- **Backend Database**: MongoDB database (via Mongoose) as the single source of truth
- **Sync Tool**: CLI application that syncs backend → OpenLP SQLite
- **Workflow**: Edit in web app → Run sync tool → OpenLP has latest songs

## Domain Model

### Song Structure

A song consists of:

- **Metadata**: Title, number (hymnbook), language, tags
- **Verses**: Ordered list of verse text (each with optional label)
- **Chorus**: Optional repeated section
- **Tags**: Categories for organization (e.g., "worship", "praise", "classic")

### Example Song

```
Title: "Amazing Grace"
Number: "123"
Language: "en"
Tags: ["worship", "classic"]

Chorus:
Amazing grace, how sweet the sound...

Verse 1:
Amazing grace, how sweet the sound,
That saved a wretch like me...

Verse 2:
'Twas grace that taught my heart to fear...
```

## Technical Decisions

### Why Mongoose?

- Mature MongoDB ODM with middleware/hooks
- Schema validation + indexes in TypeScript-friendly API
- Works seamlessly in NestJS with `@nestjs/mongoose`
- Simple integration with document-based verse and tag data

### Why MongoDB?

- Document model matches song + verses (nested documents) without heavy joins
- Flexible schema for OpenLP metadata mapping
- Easy Docker deployment (official image) and Atlas compatibility
- Handles concurrent writes without manual migrations

### Why One-Way Sync?

- Backend is source of truth
- Prevents conflicts
- Simpler to implement
- OpenLP is read-only during services

### Why Monorepo?

- Shared types between frontend/backend
- Easier development and testing
- Single version control
- Consistent tooling

## OpenLP Database Schema (Assumed)

Based on typical OpenLP installations:

```sql
-- Main songs table
songs (
  id INTEGER PRIMARY KEY,
  title TEXT,
  copyright TEXT,
  comments TEXT,  -- We store backend UUID here
  -- other OpenLP fields
)

-- Verses table
song_verses (
  id INTEGER PRIMARY KEY,
  song_id INTEGER,
  verse_order INTEGER,
  verse_text TEXT,
  verse_type TEXT  -- "verse", "chorus", "bridge"
)
```

**Note**: Actual schema may vary. We'll inspect the real schema during implementation.

## ID Mapping Strategy

### Challenge

- Backend uses UUIDs (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- OpenLP uses integers (e.g., `123`)

### Solution (MVP)

Store backend UUID in OpenLP's `comments` field as JSON:

```json
{
  "backendId": "550e8400-e29b-41d4-a716-446655440000",
  "lastSynced": "2025-01-01T00:00:00Z"
}
```

### Alternative (Future)

Create mapping table in OpenLP:

```sql
backend_sync (
  openlp_id INTEGER,
  backend_uuid TEXT,
  PRIMARY KEY (openlp_id)
)
```

## Sync Workflow

### Manual Sync (MVP)

1. User runs sync tool on church PC
2. Tool fetches all songs from backend API
3. Tool reads OpenLP database
4. Tool reconciles differences
5. Tool updates OpenLP database
6. OpenLP now has latest songs

### Scheduled Sync (Future)

- Windows Task Scheduler runs sync tool
- Runs before Sunday service
- Automatic updates

## User Workflows

### Adding a New Song

1. Open web app on phone
2. Click "Create New Song"
3. Fill in title, verses, tags
4. Save
5. Song is in backend database
6. (Later) Run sync tool to add to OpenLP

### Editing a Song

1. Open web app
2. Search/filter to find song
3. Click song to view details
4. Click "Edit"
5. Make changes
6. Save
7. (Later) Run sync tool to update OpenLP

### Syncing to OpenLP

1. On church PC, open sync tool
2. Run sync command (or double-click .bat file)
3. Tool shows progress
4. Tool shows summary: "X songs synced"
5. Open OpenLP - songs are updated

## Authentication

### Discord OAuth

- Users authenticate using their Discord account
- Only users with a specific Discord server role can access the application
- No password management needed
- User info (username, avatar) comes from Discord
- JWT tokens issued after successful Discord authentication

### Access Control

- Discord server role determines access
- Role ID configured in environment variables
- Backend verifies role membership via Discord API
- Unauthorized users see access denied message

## Common Questions

### Q: What if two people edit the same song?

**A**: Last write wins. For Phase 2, we can add versioning/conflict resolution.

### Q: Can we edit songs directly in OpenLP?

**A**: Not recommended. Backend is source of truth. Changes in OpenLP will be overwritten on next sync.

### Q: What about offline editing?

**A**: Phase 2 feature. For MVP, requires internet connection.

### Q: How do we handle song deletions?

**A**: Deleted songs in backend will be removed from OpenLP on next sync (or marked as orphaned).

### Q: What about song versions/history?

**A**: Phase 2 feature. For MVP, no version history.

### Q: What if a user loses their Discord role?

**A**: They will be denied access on next login. Admin can manually remove access if needed.

### Q: Do users need to be in a specific Discord server?

**A**: Yes, users must be members of the configured Discord server and have the required role.

## Development Context

### Local Development Setup

- Backend: `localhost:3000`
- Frontend: `localhost:5173`
- Database: Local MongoDB (Docker container or Atlas)
- Sync Tool: Run locally with test OpenLP DB

### Testing Strategy

- Backend: Unit tests for services, integration tests for API
- Frontend: Component tests, integration tests
- Sync Tool: Unit tests for mapping, integration tests with mock DB

### Code Organization

- **By feature, not by type**: `songs/` folder contains controller, service, DTOs
- **Shared code**: `packages/shared` for types
- **Documentation**: `docs/` folder for all docs

## Important Files

### Configuration Files

- `pnpm-workspace.yaml` - Monorepo workspace config
- `package.json` (root) - Workspace scripts
- `.env.example` - Environment variable templates
- `.cursorrules` - Cursor AI context configuration
- `.cursorignore` - Files to exclude from Cursor context

### Repository

- **GitHub**: https://github.com/doszyja/openlp-remote-database
- **License**: MIT

### Documentation

- `PROJECT_DESCRIPTION.md` - Original project requirements
- `PROJECT_PLAN.md` - High-level plan with epics
- `DETAILED_TODO.md` - Granular task list
- `PROJECT_RULES.md` - Coding standards and guidelines
- `ARCHITECTURE.md` - System architecture and design
- `CONTEXT.md` - This file

### Key Directories

- `apps/api/` - NestJS backend
- `apps/web/` - React frontend
- `apps/sync/` - OpenLP sync CLI tool
- `packages/shared/` - Shared TypeScript types

## Assumptions Made

1. **OpenLP Schema**: We assume a typical OpenLP schema. Will verify during implementation.
2. **One-Way Sync**: MVP is backend → OpenLP only. Two-way sync is Phase 2.
3. **No Auth in MVP**: Phase 1 works without authentication. Phase 2 adds auth.
4. **Single Church**: MVP assumes one church. Multi-tenancy is Phase 2.
5. **Windows PC**: Sync tool runs on Windows (OpenLP's primary platform).

## Future Considerations

### Phase 2 Features

- Authentication and user management
- Version history for songs
- Two-way sync (with conflict resolution)
- Advanced search (full-text)
- Song templates
- Bulk import/export

### Phase 3 Features

- Multi-tenancy (multiple churches)
- Real-time sync (WebSocket)
- Offline support (PWA)
- Mobile apps
- Analytics and usage tracking

## Getting Started (For New Developers)

1. **Read this document** - Understand the project context
2. **Read PROJECT_PLAN.md** - Understand the high-level plan
3. **Read PROJECT_RULES.md** - Understand coding standards
4. **Read ARCHITECTURE.md** - Understand system design
5. **Check DETAILED_TODO.md** - See current tasks
6. **Set up local environment** - Follow setup guide in README
7. **Start with Epic 1** - Begin with monorepo setup

## Maintaining Context

When working on tasks:

1. **Check relevant docs** - Read architecture and rules before coding
2. **Update docs** - If you make architectural decisions, update ADRs
3. **Follow conventions** - Stick to project rules for consistency
4. **Ask questions** - Document answers in this file

---

**Last Updated**: 2025-01-XX
**Maintained By**: Development Team
