# OpenLP Sync Tool

CLI application for synchronizing the backend PostgreSQL database with the OpenLP SQLite database.

## Usage

```bash
# Development
pnpm dev

# Build
pnpm build

# Run
pnpm start
```

## Configuration

Create a `.env` file or use environment variables:

- `OPENLP_DB_PATH` - Path to OpenLP SQLite database
- `API_URL` - Backend API URL
- `API_KEY` - API authentication key (if needed)
