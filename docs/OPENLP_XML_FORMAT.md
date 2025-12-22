# OpenLP XML Format Support

## Overview

This document describes how the system handles OpenLP's XML lyrics format for songs.

## OpenLP Lyrics Format

OpenLP stores song lyrics in the `songs.lyrics` column as XML with `<verse>` tags:

```xml
<verse label="v1">Verse 1 text here</verse>
<verse label="c">Chorus text here</verse>
<verse label="v2">Verse 2 text here</verse>
<verse label="b">Bridge text here</verse>
```

### Verse Types

- **v1, v2, v3...** - Regular verses
- **c, c1, c2...** - Chorus
- **b, b1, b2...** - Bridge
- **p, p1, p2...** - Pre-chorus
- **t, t1, t2...** - Tag

## Migration Script (`apps/api/src/scripts/migrate-openlp.ts`)

### XML Parsing

The migration script:
1. **Detects XML format** - Checks if lyrics start with `<` and contain `</verse>`
2. **Extracts verses** - Uses regex to find all `<verse label="...">...</verse>` tags
3. **Decodes XML entities** - Converts `&amp;`, `&lt;`, `&gt;`, etc. back to normal characters
4. **Categorizes verses** - Identifies verse type from label (v, c, b, p, t)
5. **Sorts verses** - Orders by type (pre-chorus → chorus → verses → bridge → tag)
6. **Preserves labels** - Maintains original verse labels when available

### Fallback Logic

1. **First**: Parse XML from `lyrics` column (primary method)
2. **Second**: Use `verses` table if it exists
3. **Third**: Parse plain text format `[V1]`, `[C]`, etc.
4. **Last**: Split by paragraphs or lines

## Sync Service (`apps/sync/src/services/openlp-db.service.ts`)

### Formatting for OpenLP

The sync service formats songs back to OpenLP XML format:

1. **Sorts verses** - By `order` field to maintain sequence
2. **Categorizes verses** - Separates by type (pre-chorus, chorus, verses, bridge, tag)
3. **Orders correctly** - Pre-chorus → Chorus → Verses → Bridge → Tag
4. **Generates labels** - Creates OpenLP-compatible labels (v1, v2, c, b, etc.)
5. **Escapes XML** - Converts special characters to XML entities
6. **Combines** - Joins all verse tags into single XML string

### Example Output

```xml
<verse label="p">Pre-chorus text</verse><verse label="c">Chorus text</verse><verse label="v1">Verse 1 text</verse><verse label="v2">Verse 2 text</verse><verse label="b">Bridge text</verse>
```

## API & Web Frontend

### Data Structure

Songs are stored in MongoDB with this structure:

```typescript
{
  title: string;
  verseOrder?: string; // e.g., "v1 c1 v2 c1" - 1:1 transparent with SQLite
  lyricsXml?: string; // Exact XML from SQLite lyrics column - 1:1 transparent
  verses: Array<{
    order: number;
    content: string;
    label?: string; // e.g., "Verse 1", "Bridge", "Chorus 1" (readable format)
    originalLabel?: string; // e.g., "v1", "c1", "b1" (technical format from XML/verse_order)
  }>;
}
```

**Note**: Chorus is now stored within the `verses` array as a verse object with appropriate `type` and `originalLabel`. The `verseOrder` string dictates the display sequence and repetitions.

### Frontend Support

- **SongForm** - Allows editing verse labels and content
- **SongDetailPage** - Displays verses with their labels
- **Verse ordering** - Maintains order when editing

### Backend Support

- **SongService** - Preserves verse order and labels when saving
- **API endpoints** - Return verses sorted by order
- **Validation** - Ensures verses have required fields

## Validation Checklist

✅ Migration script parses XML lyrics correctly  
✅ Sync service formats songs to OpenLP XML format  
✅ Verse ordering is preserved (by `order` field)  
✅ XML entities are properly escaped/unescaped  
✅ All verse types are supported (v, c, b, p, t)  
✅ Frontend can edit and save verses with labels  
✅ Backend preserves verse structure  
✅ Sync tool converts web format → OpenLP format  

## Testing

To test the format:

1. **Import from OpenLP**: Run migration script to import XML lyrics
2. **Edit in Web**: Modify songs in the web frontend
3. **Sync to OpenLP**: Run sync tool to export back to OpenLP
4. **Verify in OpenLP**: Check that songs display correctly in OpenLP

## MongoDB Validation

To validate songs in MongoDB Compass:

1. Connect to: `mongodb://openlp:openlp_password@localhost:27017/openlp_db?authSource=admin`
2. Check `songs` collection
3. Verify:
   - `verses` array contains objects with `order`, `content`, `label`, `originalLabel`
   - Verses are sorted by `order` (but `verseOrder` string dictates display sequence)
   - Labels are preserved (e.g., "Verse 1", "Bridge", "Chorus 1")
   - `originalLabel` stores technical format (e.g., "v1", "c1", "b1") for matching with `verseOrder`
   - Chorus is stored within `verses` array as verse object with `type: "chorus"` and `originalLabel: "c1"` (or similar)
   - `verseOrder` string (e.g., "v1 c1 v2 c1") defines the display sequence and repetitions
   - `lyricsXml` contains exact XML from SQLite for 1:1 transparency

