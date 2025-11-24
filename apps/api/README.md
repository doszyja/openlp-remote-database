# OpenLP API Backend

NestJS backend API for song management.

## Tech Stack

- **NestJS** - Node.js framework
- **TypeScript** - Type safety
- **Prisma** - ORM (to be added)
- **PostgreSQL** - Database (to be added)

## Development

```bash
# Start dev server with hot reload
pnpm dev

# Build
pnpm build

# Start production
pnpm start:prod

# Run tests
pnpm test

# Lint
pnpm lint
```

## Environment Variables

Create `.env` file (see `.env.example`):
```
DATABASE_URL=postgresql://user:password@localhost:5432/openlp_db
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

## Project Structure

```
src/
├── songs/         # Song module (to be created)
├── prisma/        # Prisma schema and migrations
├── common/        # Shared utilities
├── app.module.ts  # Root module
└── main.ts        # Entry point
```
