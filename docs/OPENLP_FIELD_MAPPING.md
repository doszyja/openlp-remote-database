# OpenLP Field Mapping

This document describes how MongoDB schema fields map to OpenLP database fields for full compatibility.

## Field Mapping Table

| MongoDB Field | OpenLP Field | Notes |
|--------------|-------------|-------|
| `title` | `title` | Song title (required) |
| `number` | `alternate_title` or `ccli_number` | Hymnbook number or CCLI number |
| `language` | N/A | Not in OpenLP, but needed for our system |
| `chorus` | N/A | Stored separately, included in XML lyrics |
| `verses[]` | `lyrics` (XML) | Verses stored as XML in lyrics column |
| `tags[]` | `theme_name` | Comma-separated themes in OpenLP |
| `copyright` | `copyright` | Copyright information |
| `comments` | `comments` | Comments/metadata field |
| `ccliNumber` | `ccli_number` | CCLI license number |
| `searchTitle` | `search_title` | Lowercase title for searching (auto-generated) |
| `openlpMapping.openlpId` | `id` | OpenLP song ID |
| `openlpMapping.lastSyncedAt` | `last_modified` | Last sync timestamp |
| `createdAt` | N/A | MongoDB timestamp |
| `updatedAt` | N/A | MongoDB timestamp |
| `deletedAt` | N/A | Soft delete flag |

## Verse Structure

### MongoDB Format
```typescript
{
  order: number,
  content: string,
  label?: string  // e.g., "Verse 1", "Bridge", "Chorus"
}
```

### OpenLP Format
```xml
<verse label="v1">Verse content</verse>
<verse label="c">Chorus content</verse>
<verse label="b">Bridge content</verse>
```

## Migration: OpenLP → MongoDB

1. **Title**: `openlpSong.title` → `song.title`
2. **Number**: `openlpSong.alternate_title` or `openlpSong.ccli_number` → `song.number`
3. **Copyright**: `openlpSong.copyright` → `song.copyright`
4. **Comments**: `openlpSong.comments` → `song.comments`
5. **CCLI Number**: `openlpSong.ccli_number` → `song.ccliNumber`
6. **Search Title**: Auto-generated from title → `song.searchTitle`
7. **Tags**: `openlpSong.theme_name` (comma-separated) → `song.tags[]`
8. **Verses**: Parsed from `openlpSong.lyrics` (XML) → `song.verses[]`
9. **Chorus**: Extracted from XML lyrics → `song.chorus`

## Sync: MongoDB → OpenLP

1. **Title**: `song.title` → `openlpSong.title`
2. **Alternate Title**: `song.number` → `openlpSong.alternate_title`
3. **CCLI Number**: `song.ccliNumber` or `song.number` → `openlpSong.ccli_number`
4. **Copyright**: `song.copyright` → `openlpSong.copyright`
5. **Comments**: `song.comments` → `openlpSong.comments`
6. **Search Title**: `song.searchTitle` or auto-generated → `openlpSong.search_title`
7. **Theme Name**: `song.tags[]` (joined) → `openlpSong.theme_name`
8. **Lyrics**: `song.verses[]` + `song.chorus` → XML format in `openlpSong.lyrics`
9. **Last Modified**: Auto-generated → `openlpSong.last_modified`

## XML Lyrics Format

### From MongoDB to OpenLP
```typescript
// MongoDB structure
{
  chorus: "Chorus text",
  verses: [
    { order: 1, content: "Verse 1", label: "Verse 1" },
    { order: 2, content: "Verse 2", label: "Verse 2" }
  ]
}

// Converts to OpenLP XML
<verse label="c">Chorus text</verse>
<verse label="v1">Verse 1</verse>
<verse label="v2">Verse 2</verse>
```

### From OpenLP to MongoDB
```xml
<!-- OpenLP XML -->
<verse label="c">Chorus text</verse>
<verse label="v1">Verse 1</verse>
<verse label="v2">Verse 2</verse>

<!-- Converts to MongoDB -->
{
  chorus: "Chorus text",
  verses: [
    { order: 1, content: "Verse 1", label: "Verse 1" },
    { order: 2, content: "Verse 2", label: "Verse 2" }
  ]
}
```

## Validation Checklist

✅ All OpenLP fields are mapped in MongoDB schema  
✅ Migration script imports all OpenLP fields  
✅ Sync service exports all fields to OpenLP format  
✅ XML lyrics format is correctly parsed and generated  
✅ Verse ordering is preserved  
✅ Search title is auto-generated  
✅ Tags are properly converted (comma-separated ↔ array)  
✅ Copyright and comments are preserved  
✅ CCLI number is handled correctly  

## MongoDB Compass Validation

To validate in MongoDB Compass:

1. Connect using: `mongodb://openlp:openlp_password@localhost:27017/openlp_db?authSource=admin`
2. Check `songs` collection
3. Verify fields exist:
   - `title` (string)
   - `number` (string | null)
   - `copyright` (string | null)
   - `comments` (string | null)
   - `ccliNumber` (string | null)
   - `searchTitle` (string)
   - `verses` (array of objects with order, content, label)
   - `chorus` (string | null)
   - `tags` (array of tag IDs)
   - `openlpMapping` (object with openlpId, lastSyncedAt)

