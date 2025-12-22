# OpenLP Web Frontend

React + Vite frontend application for managing songs.

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Material UI** - Component library
- **React Router** - Routing
- **React Query** - Server state management
- **React Hook Form** - Form handling

## Development

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type check
pnpm typecheck

# Lint
pnpm lint

# E2E tests (Playwright)
pnpm test:e2e
```

## Environment Variables

Create `.env` file:

```
VITE_API_URL=http://localhost:3000/api
```

## Testing

- `pnpm test:e2e` – runs the Playwright suite documented in `docs/E2E_TEST_STRATEGY.md`.

## Project Structure

```
src/
├── components/    # Reusable UI components
├── pages/         # Page components
├── services/      # API client
├── hooks/         # Custom React hooks
├── types/         # TypeScript types
├── App.tsx        # Main app component
├── main.tsx       # Entry point
└── theme.ts       # Material UI theme
```
