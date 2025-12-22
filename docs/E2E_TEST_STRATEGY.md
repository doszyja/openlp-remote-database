# Playwright E2E Test Strategy

This document captures the end-to-end testing approach for the React frontend, building on the coding standards in `docs/PROJECT_RULES.md`, the Material UI conventions in `docs/MATERIAL_UI_GUIDE.md`, and the product context defined throughout the documentation set.

## Goals

- Validate the most important user journeys: browsing songs, searching, syncing/export actions, and authenticated CRUD flows.
- Exercise auth edge cases so Discord-based access control keeps working as we evolve.
- Keep tests deterministic by isolating them from external services while still running the full Vite/React app.

## Tooling & Conventions

- **Runner**: [`@playwright/test`](https://playwright.dev). Config lives in `apps/web/playwright.config.ts`.
- **Server**: Tests boot the Vite dev server on port `4173`, mirroring local dev (`pnpm dev`).
- **Mocking**: `apps/web/e2e/utils/mockApi.ts` intercepts `/api/**` requests to simulate Mongo/Discord responses. This preserves the one-way sync model highlighted in `docs/ARCHITECTURE.md` without requiring Docker services.
- **Selectors**: Prefer accessible roles/text that align with Material UI usage; no brittle CSS selectors.

## Scenario Coverage

| Feature / Risk              | Spec                | Notes                                                                                                               |
| --------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Anonymous browsing & search | `song-list.spec.ts` | Verifies default feed, search debounce, and absence of edit controls when `hasEditPermission` is false.             |
| Pagination & load-more UX   | `song-list.spec.ts` | Confirms incremental data loading and detection of terminal pages.                                                  |
| API failure recovery        | `song-list.spec.ts` | Ensures the full-screen error overlay (see `docs/PROJECT_RULES.md` error UX) can recover via retry.                 |
| Export ZIP guardrails       | `song-list.spec.ts` | Checks that only editors see the export button and that the success toast fires after a mocked blob download.       |
| Song creation               | `song-crud.spec.ts` | Walks through the SongForm, verse handling, and success navigation. Asserts payloads to keep XML generation stable. |
| Song editing                | `song-crud.spec.ts` | Exercises dirty-state protection and update requests.                                                               |
| Song deletion               | `song-crud.spec.ts` | Validates confirmation dialog + navigation back to the list.                                                        |
| Discord callback success    | `auth.spec.ts`      | Verifies token persistence + privilege-gated UI after `/auth/callback?token=...`.                                   |
| Discord callback failure    | `auth.spec.ts`      | Confirms Polish error messaging for missing roles and auto-redirect back to `/songs`.                               |

## Running the Suite

```bash
pnpm install           # once, at repo root
pnpm --filter web test:e2e
```

Environment details:

- Browsers: Playwright installs Chromium via `npx playwright install` (run once if missing).
- Base URL: `http://127.0.0.1:4173` (configurable via `PLAYWRIGHT_BASE_URL`).
- CI: Retries enabled (see `playwright.config.ts`) to satisfy the reliability targets described in `docs/PROJECT_RULES.md`.

## Mocking Strategy

- **Songs API**: `setupSongApiMock` keeps an in-memory map so tests can assert on request payloads (create/update/delete) while still hitting the real React Query hooks.
- **Auth API**: `setupAuthMock` simulates `/auth/me` so Discord role checks stay deterministic.
- **ZIP export**: Fulfilled with a minimal binary payload, allowing the browser to exercise the download path without touching the OpenLP sync tool (per `docs/CONTEXT.md` one-way sync constraints).

This balance keeps tests fast and hermetic while honoring the Mongo-as-source-of-truth assumption.

## Future Enhancements

- Exercise Audit Log filtering and admin-only flows once UI polish from `docs/DETAILED_TODO.md` lands.
- Add responsive viewport coverage (e.g., mobile breakpoints from `docs/MATERIAL_UI_GUIDE.md`).
- Wire a smoke suite against the real NestJS API within Docker to complement the mocked coverage.
- Cover OpenLP presentation mode and offline banner work (`Task 3.14`) when implemented.

Please update this document whenever scenarios are added or assumptions change so Cursor stays aligned with the latest QA strategy.
