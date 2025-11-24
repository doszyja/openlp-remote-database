# MongoDB Schema OpenLP Compatibility - Validation Summary

## ✅ Completed Tasks

### 1. MongoDB Schema Updated (`apps/api/src/schemas/song.schema.ts`)
- ✅ Added `copyright` field (maps to OpenLP `copyright`)
- ✅ Added `comments` field (maps to OpenLP `comments`)
- ✅ Added `ccliNumber` field (maps to OpenLP `ccli_number`)
- ✅ Added `searchTitle` field (maps to OpenLP `search_title`, auto-generated)
- ✅ Added index on `searchTitle` for OpenLP-compatible searching

### 2. DTOs Updated (`apps/api/src/songs/dto/create-song.dto.ts`)
- ✅ Added OpenLP compatibility fields to `CreateSongDto`
- ✅ `UpdateSongDto` inherits all fields via `PartialType`

### 3. Service Layer Updated (`apps/api/src/songs/song.service.ts`)
- ✅ Auto-generates `searchTitle` from title on create
- ✅ Regenerates `searchTitle` when title is updated
- ✅ Returns all OpenLP fields in API responses (`findAll`, `findOne`)

### 4. Migration Script Updated (`apps/api/src/scripts/migrate-openlp.ts`)
- ✅ Maps `copyright` from OpenLP → MongoDB
- ✅ Maps `comments` from OpenLP → MongoDB
- ✅ Maps `ccliNumber` from OpenLP → MongoDB
- ✅ Auto-generates `searchTitle` from title
- ✅ Prioritizes `alternate_title` over `ccli_number` for `number` field

### 5. Sync Service Updated (`apps/sync/src/services/openlp-db.service.ts`)
- ✅ Exports `copyright` to OpenLP `copyright` field
- ✅ Exports `comments` to OpenLP `comments` field
- ✅ Exports `ccliNumber` to OpenLP `ccli_number` field
- ✅ Exports `searchTitle` to OpenLP `search_title` field
- ✅ Maps `number` to OpenLP `alternate_title`
- ✅ Formats verses to OpenLP XML format with proper ordering

### 6. Shared Types Updated (`packages/shared/src/types/song.ts`)
- ✅ Added OpenLP compatibility fields to `Song` interface

### 7. Migration Re-run
- ✅ Successfully re-ran migration
- ✅ Imported 62 new songs with OpenLP fields
- ✅ Skipped 2374 existing songs (already in database)

## Field Mapping Verification

### MongoDB → OpenLP (Sync)
| MongoDB Field | OpenLP Field | Status |
|--------------|-------------|--------|
| `title` | `title` | ✅ Mapped |
| `number` | `alternate_title` | ✅ Mapped |
| `ccliNumber` or `number` | `ccli_number` | ✅ Mapped |
| `copyright` | `copyright` | ✅ Mapped |
| `comments` | `comments` | ✅ Mapped |
| `searchTitle` | `search_title` | ✅ Auto-generated |
| `tags[]` | `theme_name` (comma-separated) | ✅ Mapped |
| `verses[]` + `chorus` | `lyrics` (XML) | ✅ Formatted |

### OpenLP → MongoDB (Migration)
| OpenLP Field | MongoDB Field | Status |
|-------------|--------------|--------|
| `title` | `title` | ✅ Mapped |
| `alternate_title` | `number` | ✅ Mapped |
| `ccli_number` | `ccliNumber` or `number` | ✅ Mapped |
| `copyright` | `copyright` | ✅ Mapped |
| `comments` | `comments` | ✅ Mapped |
| `search_title` | `searchTitle` | ✅ Auto-generated |
| `theme_name` | `tags[]` | ✅ Parsed |
| `lyrics` (XML) | `verses[]` + `chorus` | ✅ Parsed |

## Testing Checklist

### ✅ Completed
- [x] Schema updated with all OpenLP fields
- [x] DTOs accept OpenLP fields
- [x] Service auto-generates `searchTitle`
- [x] Migration script imports OpenLP fields
- [x] Sync service exports OpenLP fields
- [x] All packages rebuilt successfully
- [x] Migration re-run successfully

### 🔄 To Verify (Manual Testing)

1. **MongoDB Compass Validation**
   - Connect: `mongodb://openlp:openlp_password@localhost:27017/openlp_db?authSource=admin`
   - Check `songs` collection
   - Verify fields: `copyright`, `comments`, `ccliNumber`, `searchTitle`
   - Verify `searchTitle` is lowercase version of `title`

2. **API Endpoint Testing**
   - GET `/api/songs` - Verify OpenLP fields in response
   - POST `/api/songs` - Create song with OpenLP fields
   - PATCH `/api/songs/:id` - Update song, verify `searchTitle` regenerates

3. **Sync Tool Testing**
   - Run: `cd apps/sync && pnpm start sync --dry-run`
   - Verify OpenLP fields are exported correctly
   - Check SQLite database for field values

4. **Round-Trip Testing**
   - Create song in web app
   - Verify in MongoDB
   - Run sync tool
   - Verify in OpenLP SQLite database
   - Re-import via migration script
   - Verify data integrity

## Code Changes Summary

### Files Modified
1. `apps/api/src/schemas/song.schema.ts` - Added OpenLP fields
2. `apps/api/src/songs/dto/create-song.dto.ts` - Added OpenLP fields
3. `apps/api/src/songs/song.service.ts` - Auto-generate searchTitle, return OpenLP fields
4. `apps/api/src/scripts/migrate-openlp.ts` - Import OpenLP fields
5. `apps/sync/src/services/openlp-db.service.ts` - Export OpenLP fields
6. `packages/shared/src/types/song.ts` - Added OpenLP fields to interface

### Files Created
1. `docs/OPENLP_FIELD_MAPPING.md` - Field mapping documentation
2. `docs/SCHEMA_COMPATIBILITY_VALIDATION.md` - This file

## Next Steps

1. **Start API Server** (if not running)
   ```bash
   cd apps/api
   pnpm start:dev
   ```

2. **Test API Endpoints**
   - Create a song with OpenLP fields
   - Verify response includes all fields
   - Update song title, verify `searchTitle` updates

3. **Test Sync Tool**
   - Ensure API is running
   - Run sync tool (dry-run first)
   - Verify OpenLP SQLite database has correct fields

4. **Validate in MongoDB Compass**
   - Check a few songs have OpenLP fields populated
   - Verify `searchTitle` is lowercase and matches title

## Notes

- `searchTitle` is automatically generated from `title` - no manual input needed
- `number` field can come from either `alternate_title` or `ccli_number` in OpenLP
- All OpenLP fields are optional in MongoDB (nullable)
- XML lyrics format is preserved during sync (verses → XML → verses)

