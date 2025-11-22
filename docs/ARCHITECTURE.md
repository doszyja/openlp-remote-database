# Architecture Documentation

## System Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   React Web     │────────▶│   NestJS API     │────────▶│   PostgreSQL    │
│   (Frontend)    │  HTTP   │   (Backend)      │  Prisma │   (Database)    │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                      ▲
                                      │ HTTP REST API
                                      │
                            ┌─────────┴─────────┐
                            │                   │
                    ┌───────▼──────┐   ┌───────▼──────┐
                    │  OpenLP DB   │   │  Sync Tool   │
                    │  (SQLite)    │◀──│  (Node CLI)  │
                    └──────────────┘   └──────────────┘
```

## Monorepo Structure

```
openlp-database/
├── apps/
│   ├── api/              # NestJS backend
│   ├── web/              # React frontend
│   └── sync/             # OpenLP sync CLI tool
├── packages/
│   └── shared/           # Shared TypeScript types and utilities
├── docs/                 # Project documentation
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

## Technology Stack

### Backend (`apps/api`)
- **Framework**: NestJS (latest stable)
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL (production), SQLite (development)
- **Validation**: class-validator, class-transformer
- **API Docs**: Swagger/OpenAPI

### Frontend (`apps/web`)
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Routing**: React Router v6
- **HTTP Client**: Fetch API or axios
- **State Management**: React Query or SWR
- **Styling**: Material UI (MUI)
- **Form Handling**: React Hook Form with Material UI components

### Sync Tool (`apps/sync`)
- **Runtime**: Node.js
- **Language**: TypeScript
- **SQLite**: better-sqlite3
- **HTTP Client**: axios or fetch
- **CLI**: commander.js
- **Config**: JSON or YAML

### Shared (`packages/shared`)
- **TypeScript**: Shared types, DTOs, interfaces
- **Build**: tsc or tsup

## Data Models

### Song Model (Backend)

```typescript
model Song {
  id        String   @id @default(uuid())
  title     String
  number    String?  // Hymnbook number
  language  String   @default("en")
  chorus    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime? // Soft delete
  
  verses    Verse[]
  tags      Tag[]
  openlpMapping OpenLPMapping?
}

model Verse {
  id      String @id @default(uuid())
  songId  String
  song    Song   @relation(fields: [songId], references: [id], onDelete: Cascade)
  order   Int
  content String
  label   String? // "Verse 1", "Bridge", etc.
  
  @@index([songId, order])
}

model Tag {
  id    String @id @default(uuid())
  name  String @unique
  songs Song[]
}

model OpenLPMapping {
  id          String   @id @default(uuid())
  songId      String   @unique
  song        Song     @relation(fields: [songId], references: [id])
  openlpId    Int?     // OpenLP's internal ID
  lastSyncedAt DateTime?
  syncMetadata Json?   // Additional sync info
}
```

### OpenLP Schema (Assumed)

```sql
-- OpenLP songs table
CREATE TABLE songs (
  id INTEGER PRIMARY KEY,
  title TEXT,
  copyright TEXT,
  comments TEXT,  -- We'll store backend UUID here
  -- ... other OpenLP fields
);

-- OpenLP verses table
CREATE TABLE song_verses (
  id INTEGER PRIMARY KEY,
  song_id INTEGER,
  verse_order INTEGER,
  verse_text TEXT,
  verse_type TEXT,  -- "verse", "chorus", "bridge"
  FOREIGN KEY (song_id) REFERENCES songs(id)
);
```

## API Design

### Base URL
- Development: `http://localhost:3000/api`
- Production: `https://api.yourdomain.com/api`

### Endpoints

#### Songs
- `GET /songs` - List songs (paginated, filtered)
- `GET /songs/:id` - Get single song
- `POST /songs` - Create song
- `PATCH /songs/:id` - Update song
- `DELETE /songs/:id` - Delete song
- `GET /songs/search?q=...` - Search songs

#### Tags (Future)
- `GET /tags` - List all tags
- `POST /tags` - Create tag

### Request/Response Examples

#### Create Song
```http
POST /api/songs
Content-Type: application/json

{
  "title": "Amazing Grace",
  "number": "123",
  "language": "en",
  "chorus": "Amazing grace, how sweet...",
  "verses": [
    {
      "order": 1,
      "content": "Verse 1 content...",
      "label": "Verse 1"
    }
  ],
  "tags": ["worship", "classic"]
}
```

#### List Songs
```http
GET /api/songs?page=1&limit=20&language=en&tags=worship
```

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Amazing Grace",
      "number": "123",
      "language": "en",
      "verses": [...],
      "tags": [...],
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Sync Algorithm

### One-Way Sync (Backend → OpenLP)

1. **Fetch from Backend**
   - Call `GET /api/songs` to get all songs
   - Or use `GET /api/songs?updatedSince=...` for incremental sync

2. **Read OpenLP Database**
   - Connect to OpenLP SQLite file
   - Read all existing songs
   - Extract backend UUIDs from `comments` field

3. **Reconciliation**
   - For each backend song:
     - If UUID exists in OpenLP → Update
     - If UUID doesn't exist → Insert
   - For each OpenLP song:
     - If UUID not in backend list → Delete (or mark as orphaned)

4. **Mapping & Transformation**
   - Map backend song to OpenLP format
   - Combine verses and chorus appropriately
   - Store backend UUID in OpenLP `comments` as JSON:
     ```json
     {
       "backendId": "uuid-here",
       "lastSynced": "2025-01-01T00:00:00Z"
     }
     ```

5. **Write to OpenLP**
   - Insert/update songs in OpenLP database
   - Update verses
   - Handle errors gracefully (continue with next song)

### ID Mapping Strategy

**Option 1: Store in Comments (Recommended for MVP)**
- Store backend UUID in OpenLP `songs.comments` field as JSON
- Pros: No schema changes to OpenLP
- Cons: Comments field might be used for other purposes

**Option 2: Custom Mapping Table**
- Create `backend_sync` table in OpenLP DB
- Store `openlp_id` → `backend_uuid` mapping
- Pros: Clean separation
- Cons: Requires schema modification

**Option 3: Use OpenLP ID as Reference**
- Store OpenLP ID in backend `OpenLPMapping.openlpId`
- Pros: Simple
- Cons: If OpenLP ID changes, mapping breaks

**Decision**: Use Option 1 for MVP, can migrate to Option 2 later.

## Security Architecture

### Authentication (Phase 2)
- **Discord OAuth 2.0**: Users authenticate via Discord
- **JWT-based sessions**: Backend issues JWT tokens after Discord auth
- **Token storage**: httpOnly cookie (recommended) or localStorage
- **Refresh mechanism**: Refresh JWT or re-authenticate with Discord

### Discord OAuth Flow
1. User clicks "Login with Discord"
2. Redirect to Discord OAuth authorization
3. User authorizes application
4. Discord redirects back with authorization code
5. Backend exchanges code for access token
6. Backend fetches user info and guild membership from Discord API
7. Backend verifies user has required Discord server role
8. Backend creates/updates user in database
9. Backend issues JWT token
10. Frontend stores token and redirects to app

### Authorization
- **Role-based access control (RBAC)**: Based on Discord server roles
- **Discord role verification**: Check user's role in Discord server
- **Database roles**: Store Discord roles in database for caching
- **Guards**: NestJS guards protect endpoints
- **Role requirements**: Specific Discord role ID required for access

### API Security
- CORS configuration
- Rate limiting (future)
- Input validation and sanitization
- SQL injection prevention (Prisma handles this)
- JWT token validation on protected routes

## Deployment Architecture

### Development
- Backend: `localhost:3000`
- Frontend: `localhost:5173` (Vite default)
- Database: Local PostgreSQL or SQLite
- Sync Tool: Run locally

### Production (Recommended)
- **Docker Compose**: All services (backend, frontend, database) in Docker containers
- **Alternative**: Backend on VPS, Frontend on static hosting (Vercel, Netlify)
- **Database**: PostgreSQL in Docker container or managed service (AWS RDS, Supabase, etc.)
- **Sync Tool**: Installed on church Windows PC (not containerized)

### Docker Setup
- **Development**: `docker-compose.yml` with hot reload and volume mounts
- **Production**: `docker-compose.prod.yml` with optimized builds
- **Services**: PostgreSQL, NestJS API, React Frontend (nginx)
- **Networking**: Internal Docker network for service communication
- **Volumes**: Persistent database storage

### Environment Variables

#### Backend
```
DATABASE_URL=postgresql://...
PORT=3000
NODE_ENV=production
JWT_SECRET=... (Phase 2)
CORS_ORIGIN=https://yourdomain.com
DISCORD_CLIENT_ID=... (Phase 2)
DISCORD_CLIENT_SECRET=... (Phase 2)
DISCORD_CALLBACK_URL=https://yourdomain.com/auth/discord/callback (Phase 2)
DISCORD_GUILD_ID=... (Phase 2 - Discord server ID)
DISCORD_REQUIRED_ROLE_ID=... (Phase 2 - Required role ID)
```

#### Frontend
```
VITE_API_URL=https://api.yourdomain.com/api
```

#### Sync Tool
```
OPENLP_DB_PATH=C:\Program Files\OpenLP\songs.sqlite
API_URL=https://api.yourdomain.com/api
API_KEY=... (if auth implemented)
```

## Performance Considerations

### Backend
- Database indexes on frequently queried fields
- Pagination for all list endpoints
- Consider caching for tag list, language list
- Connection pooling for database

### Frontend
- Code splitting by route
- Lazy load components
- Debounce search inputs
- Cache API responses (React Query)

### Sync Tool
- Batch operations where possible
- Process songs in chunks
- Log progress for long-running syncs

## Error Handling Strategy

### Backend
- Global exception filter
- Consistent error response format
- Logging with context (request ID, user ID)
- Error codes for different error types

### Frontend
- Error boundaries for component errors
- API error handling with user-friendly messages
- Retry logic for network errors
- Offline detection (future)

### Sync Tool
- Continue processing on individual song errors
- Log all errors with context
- Generate error summary report
- Exit codes: 0 = success, 1 = errors occurred, 2 = fatal error

## Future Enhancements

### Phase 2
- Authentication and authorization
- Multi-tenancy (multiple churches)
- Version history for songs
- Advanced search (full-text)

### Phase 3
- Real-time sync (WebSocket)
- Offline support (PWA)
- Mobile apps (React Native)
- Song analytics and usage tracking

---

**Last Updated**: 2025-01-XX

