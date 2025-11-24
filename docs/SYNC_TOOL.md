# Sync Tool Documentation

## Overview

The sync tool is a CLI application that syncs songs from the backend PostgreSQL database to the local OpenLP SQLite database. It performs a one-way sync: **Backend → OpenLP**.

## Installation

The sync tool is part of the monorepo. Install dependencies:

```bash
pnpm install
```

Build the sync tool:

```bash
cd apps/sync
pnpm build
```

## Configuration

Create a `.env` file in `apps/sync/` directory:

```env
# OpenLP Database
OPENLP_DB_PATH=C:\Program Files\OpenLP\songs.sqlite

# API Configuration
API_BASE_URL=http://localhost:3000/api
API_KEY=

# Sync Options
SYNC_BATCH_SIZE=100
SYNC_TIMEOUT=30000
```

### Environment Variables

- `OPENLP_DB_PATH` (required): Path to OpenLP SQLite database file
- `API_BASE_URL` (optional): Backend API URL (default: `http://localhost:3000/api`)
- `API_KEY` (optional): API key for authentication (if required)
- `SYNC_BATCH_SIZE` (optional): Number of songs to fetch per batch (default: 100)
- `SYNC_TIMEOUT` (optional): Request timeout in milliseconds (default: 30000)

## Usage

### Sync All Songs

Sync all songs from backend to OpenLP:

```bash
pnpm start sync
```

Options:
- `--dry-run` / `-d`: Perform a dry run without making changes
- `--verbose` / `-v`: Enable verbose logging
- `--force`: Force sync even if already synced

Example:
```bash
pnpm start sync --verbose
pnpm start sync --dry-run
```

### Sync Single Song

Sync a specific song by ID:

```bash
pnpm start sync-song <songId>
```

Options:
- `--dry-run` / `-d`: Perform a dry run
- `--verbose` / `-v`: Enable verbose logging

Example:
```bash
pnpm start sync-song abc123 --verbose
```

### List Songs in OpenLP

List all songs currently in the OpenLP database:

```bash
pnpm start list
```

Options:
- `--verbose` / `-v`: Show detailed information

## How It Works

1. **Fetch Songs**: The tool fetches all songs from the backend API (with pagination)
2. **Format Conversion**: Converts backend song format to OpenLP format:
   - Combines verses and chorus into a single lyrics field
   - Formats verse labels (Verse 1, Chorus, Bridge, etc.)
   - Maps song metadata
3. **Database Operations**: 
   - Creates new songs in OpenLP database
   - Updates existing songs (if OpenLP ID mapping exists)
   - Inserts verses with proper ordering
4. **Transaction Safety**: All operations use SQLite transactions for data integrity

## OpenLP Database Schema

The tool expects the following OpenLP database structure:

### `songs` table
- `id` (INTEGER PRIMARY KEY)
- `title` (TEXT)
- `alternate_title` (TEXT, nullable) - Used for hymnbook number
- `lyrics` (TEXT) - Combined verses and chorus
- `search_title` (TEXT) - Lowercase title for searching
- `last_modified` (TEXT) - ISO datetime

### `verses` table
- `id` (INTEGER PRIMARY KEY)
- `song_id` (INTEGER, FOREIGN KEY)
- `verse_order` (INTEGER)
- `verse_type` (TEXT) - 'v1', 'v2', 'c', 'b', etc.
- `verse_text` (TEXT)

## Error Handling

- Network errors are caught and logged
- Database errors are caught and logged
- Failed songs are counted but don't stop the sync
- Exit code 1 is returned if any errors occurred

## Development

Run in development mode with hot reload:

```bash
pnpm dev
```

Build for production:

```bash
pnpm build
```

## Troubleshooting

### Database Locked Error
- Make sure OpenLP is not running
- Check file permissions on the database file

### API Connection Error
- Verify `API_BASE_URL` is correct
- Check if backend API is running
- Verify network connectivity

### Type Errors
- Run `pnpm build:shared` first to build shared types
- Ensure all dependencies are installed

## Future Enhancements

- [ ] Two-way sync (OpenLP → Backend)
- [ ] Conflict resolution
- [ ] Incremental sync (only changed songs)
- [ ] Backup before sync
- [ ] Sync statistics and reporting

