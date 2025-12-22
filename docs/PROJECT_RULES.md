# Project Rules & Guidelines

## Code Style & Standards

### TypeScript

- **Strict mode**: Always use TypeScript strict mode
- **No `any` types**: Use `unknown` or proper types instead
- **Explicit return types**: Functions should have explicit return types (except simple arrow functions)
- **Interfaces over types**: Prefer `interface` for object shapes, use `type` for unions/intersections

### Naming Conventions

- **Files**: kebab-case (e.g., `song-service.ts`, `song-form.tsx`)
- **Classes**: PascalCase (e.g., `SongService`, `SongController`)
- **Functions/Variables**: camelCase (e.g., `getSongById`, `songList`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`, `MAX_VERSES`)
- **Components**: PascalCase matching file name (e.g., `SongForm` in `song-form.tsx`)

### File Organization

- **One class/component per file**: Keep files focused
- **Barrel exports**: Use `index.ts` for clean imports
- **Group by feature**: Organize by domain, not by type (e.g., `songs/` folder with controller, service, DTOs)

### Git & Commits

- **Branch naming**: `feature/`, `fix/`, `refactor/`, `docs/`
- **Commit messages**:
  - Format: `type(scope): description`
  - Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
  - Example: `feat(api): add song search endpoint`
- **Small commits**: Commit logical units of work

## Architecture Principles

### Backend (NestJS)

- **Dependency Injection**: Always use DI, avoid direct instantiation
- **Service Layer**: Business logic in services, not controllers
- **DTOs**: Use DTOs for all API inputs/outputs, validate with class-validator
- **Error Handling**: Use NestJS exception filters, return consistent error format
- **Database**: All DB access through Prisma service, no raw queries unless necessary

### Frontend (React)

- **Component Composition**: Prefer composition over inheritance
- **Hooks**: Use custom hooks for reusable logic
- **State Management**:
  - Server state: React Query or SWR
  - Local UI state: useState/useReducer
  - Global state: Context API (only if needed)
- **Forms**: Use controlled components, validate before submit
  - Use React Hook Form for form management
  - Handle async data loading with useEffect and form.reset()
  - Initialize defaultValues on mount, reset when async data arrives
- **API Calls**: Centralize in service layer, use typed API client
- **Verse Handling**:
  - Verses are stored as a single string in the backend (XML or plain text)
  - Use `verseParser.ts` utilities to parse verses for display
  - Parse verses into individual editable boxes in forms
  - Combine verses back to string format before saving
  - Preserve verse_order from OpenLP when parsing/combining

### Sync Tool

- **Idempotency**: Sync operations should be safe to run multiple times
- **Error Recovery**: Log errors but continue processing other songs
- **Dry Run**: Always support dry-run mode for testing
- **Configuration**: Support both config file and environment variables
- **Testing**: Use Vitest for unit tests (not Jest)
  - Mock dependencies with `vi.mock()`
  - Use `vi.fn()` for function mocks
  - Use `describe`, `it`, `expect` from Vitest globals

## Testing Strategy

### Backend

- **Unit Tests**: Test services and utilities in isolation
- **Integration Tests**: Test API endpoints with test database
- **E2E Tests**: Test critical user flows (create song, sync)

### Frontend

- **Component Tests**: Test components with React Testing Library
- **Integration Tests**: Test user interactions and API calls
- **E2E Tests**: Test complete workflows (optional, use Playwright/Cypress)

### Sync Tool

- **Unit Tests**: Test mapping functions and sync logic
  - Use Vitest as the testing framework
  - Mock OpenLPDbService and ApiClientService
  - Test error handling and edge cases
- **Integration Tests**: Test with mock OpenLP DB and API

## Database Rules

### MongoDB (Mongoose)

- **Migrations**: Use Mongoose migrations for schema changes (if needed)
- **Seeding**: Use seed scripts for initial data
- **Relations**: Use proper references and populate for relations
- **Indexes**: Add indexes for frequently queried fields (title, language, tags)
- **Connection**: Use `DATABASE_URL` environment variable for connection string

### Prisma (Legacy - Migrated to MongoDB)

- **Note**: Project migrated from PostgreSQL/Prisma to MongoDB/Mongoose on 2025-01-22
- Old Prisma rules kept for reference but no longer in use

### Data Integrity

- **Soft Deletes**: Consider soft deletes for songs (add `deletedAt` field)
- **Audit Trail**: Track `createdAt` and `updatedAt` on all models
- **Constraints**: Use database constraints (unique, foreign keys)

## API Design Rules

### REST Endpoints

- **Naming**: Use nouns, not verbs (`/songs`, not `/getSongs`)
- **HTTP Methods**:
  - GET for reads
  - POST for creates
  - PATCH for partial updates
  - PUT for full replacements (avoid if possible)
  - DELETE for deletes
- **Status Codes**: Use appropriate status codes (200, 201, 400, 404, 500)
- **Pagination**: Always paginate list endpoints (default: 20 items)
- **Filtering**: Use query parameters for filters (`?language=en&tags=worship`)

### Response Format

```typescript
// Success
{
  "data": { ... },
  "meta": { ... } // for pagination, etc.
}

// Error
{
  "error": {
    "code": "SONG_NOT_FOUND",
    "message": "Song with id xyz not found",
    "details": { ... }
  }
}
```

## Security Guidelines

### Backend

- **Input Validation**: Always validate and sanitize inputs
- **SQL Injection**: Use Mongoose (parameterized queries)
- **CORS**: Configure CORS properly for production
- **Rate Limiting**: Add rate limiting for API endpoints (using ThrottlerModule)
- **Secrets**: Never commit secrets, use environment variables
- **Authentication**: Use JWT tokens for authentication
- **Authorization**: Use role-based access control (RBAC) with Discord roles
  - All Discord guild members can log in
  - Only users with required role (`DISCORD_REQUIRED_ROLE_ID`) can edit/delete/export
  - Use `EditPermissionGuard` to protect edit/delete endpoints
  - Check `hasEditPermission` flag in user object

### Frontend

- **XSS Prevention**: Sanitize user inputs, use React's built-in escaping
- **API Keys**: Never expose API keys in frontend code
- **Sensitive Data**: Don't store sensitive data in localStorage (only store JWT token)
- **Authentication**: Use `AuthContext` for authentication state
- **Authorization**: Check `hasEditPermission` flag before showing edit/delete buttons
  - Use `hasEditPermission` from `useAuth()` hook
  - Hide edit/delete actions for users without permission
  - Show appropriate error messages for unauthorized actions

## Performance Guidelines

### Backend

- **Database Queries**: Use Prisma's `include`/`select` to avoid N+1 queries
- **Caching**: Consider caching for frequently accessed data (future)
- **Pagination**: Always paginate large datasets

### Frontend

- **Code Splitting**: Use React.lazy for route-based code splitting
- **Image Optimization**: Optimize images before adding
- **Bundle Size**: Monitor bundle size, use tree-shaking
- **API Calls**: Debounce search inputs, cache API responses

## Documentation Requirements

### Code Documentation

- **JSDoc**: Document public functions and classes
- **README**: Each app/package should have a README
- **API Docs**: Keep Swagger/OpenAPI docs up to date

### Project Documentation

- **ADRs**: Document architectural decisions
- **Changelog**: Keep CHANGELOG.md updated
- **Setup Guide**: Document local development setup

## Monorepo Rules

### Workspace Dependencies

- **Shared Code**: Use `packages/shared` for shared types/utilities
- **Internal Dependencies**: Reference workspace packages with `workspace:*`
- **Versioning**: Keep versions in sync across workspace

### Scripts

- **Root Scripts**: Use root `package.json` for common tasks
- **App Scripts**: Each app has its own scripts
- **Naming**: Use prefixes (`dev:`, `build:`, `test:`) for clarity

## OpenLP Integration Rules

### Sync Strategy

- **One-Way Sync**: Backend → OpenLP (MVP)
- **ID Mapping**: Store backend UUID in OpenLP metadata
- **Conflict Resolution**: Backend always wins (it's the source of truth)
- **Sync Frequency**: Manual or scheduled (not real-time)

### Data Mapping

- **Verses**: Map verses with order, preserve verse types (verse/chorus)
- **Metadata**: Store backend ID in OpenLP `comments` field as JSON
- **Tags**: Map to OpenLP categories if possible, or store in metadata

## Error Handling

### Backend

- **Exception Filters**: Use global exception filter
- **Error Codes**: Define error codes for different error types
- **Logging**: Log errors with context (userId, requestId, etc.)

### Frontend

- **Error Boundaries**: Use React error boundaries for component errors
- **User Feedback**: Show user-friendly error messages
- **Retry Logic**: Implement retry for network errors

### Sync Tool

- **Continue on Error**: Don't stop sync if one song fails
- **Error Reporting**: Report all errors in summary
- **Logging**: Log to file for debugging

## Development Workflow

### Before Starting Work

1. Check current TODO list
2. Read relevant documentation
3. Understand the context from ADRs

### During Development

1. Write code following these rules
2. Add tests for new features
3. Update documentation as needed
4. For local development: Use `docker-compose.dev.yml` to run MongoDB in Docker while running API/Web locally for hot-reloading

### Before Committing

1. Run linter and formatter
2. Run tests
3. Check for console.logs or debug code
4. Write clear commit message

### Docker Development Setup

- **MongoDB**: Run in Docker using `docker-compose.dev.yml`
- **API**: Run locally with `pnpm dev` for hot-reloading
- **Web**: Run locally with `pnpm dev` for hot-reloading
- **Connection**: API connects to Dockerized MongoDB via `DATABASE_URL`
- **Benefits**: Fast development iteration with hot-reloading while maintaining consistent database environment

### Code Review Checklist

- [ ] Follows project rules
- [ ] Has tests
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Error handling implemented
- [ ] Performance considered

## Future Considerations

### Scalability

- Plan for multiple churches (multi-tenancy)
- Consider caching strategy
- Plan for offline support (PWA)

### Features

- Version history for songs
- Song templates
- Bulk import/export
- Advanced search (full-text)
- Song analytics (usage tracking)

## Verse Parsing & Format Rules

### Verse Storage Format

- **Backend Storage**: Verses are stored as a single string field
  - Can be XML format (from OpenLP): `<verse label="v1">content</verse>`
  - Can be plain text format: verses separated by `\n\n`
- **Frontend Display**: Verses are parsed into individual `ParsedVerse` objects
  - Each verse has: `order`, `content`, `label`, `type`
  - Types: `'verse' | 'chorus' | 'bridge' | 'pre-chorus' | 'tag'`

### Verse Parsing Utilities

- **Location**: `apps/web/src/utils/verseParser.ts`
- **Functions**:
  - `parseVerses()`: Auto-detect and parse XML or string format
  - `parseVersesFromXml()`: Parse OpenLP XML format
  - `parseVersesFromString()`: Parse plain text format
  - `combineVersesToString()`: Combine parsed verses back to string (preserves order)
  - `getVerseDisplayLabel()`: Get human-readable label for display
  - `generateVerseOrderString()`: Generate order string (e.g., "v1 c1 v2")
  - `parseVerseOrderString()`: Parse order string and update verse sequence

### Verse Order Management

- **OpenLP verse_order**: Preserved when parsing and combining verses
- **Frontend Input**: Editable string format (e.g., "v1 c1 v2 c1 v3 c1 v4 c1")
- **Mapping**: `v` = verse, `c` = chorus, `b` = bridge, `p` = pre-chorus, `t` = tag
- **Storage**: Verse order is maintained through the `order` property in `ParsedVerse`

### Form Handling

- **Initial Load**: Parse verses from string/XML into individual form fields
- **Editing**: Each verse displayed as separate editable box with type selector
- **Submission**: Combine verses back to single string, sorted by `order` property
- **Async Data**: Use `useEffect` with `form.reset()` when song data loads asynchronously

## UI/UX Guidelines

### Notification System

- **Implementation**: Use `NotificationContext` for global notifications
- **Usage**: Import `useNotification()` hook, call `showSuccess()` or `showError()`
- **Position**: Top-center using Material UI Snackbar
- **Duration**: 3 seconds auto-dismiss
- **Styling**: Material UI Alert component with severity colors

### Navigation

- **Client-Side Routing**: Use React Router `Link` component for smooth navigation
- **No Page Blinks**: Optimize React Query config (refetchOnMount: false, staleTime: 5min)
- **Scroll Preservation**: Maintain scroll positions when navigating between pages
- **Auto-Scroll**: Scroll to selected items in lists when navigating

### Responsive Design

- **Mobile-First**: Design for mobile, enhance for desktop
- **Breakpoints**: Use Material UI breakpoints (xs, sm, md, lg, xl)
- **Layout**: Stack elements vertically on mobile, horizontal on desktop
- **Buttons**: Full-width on mobile, auto-width on desktop
- **Hidden Elements**: Hide non-essential elements on mobile (e.g., search column, toggle switches)

### React Query Configuration

- **refetchOnMount**: false (prevent refetching when navigating to cached pages)
- **staleTime**: 5 minutes (data considered fresh for 5 minutes)
- **refetchOnWindowFocus**: false (prevent refetching on window focus)
- **Result**: Smooth navigation without page blinks or unnecessary API calls

### Loading State Management

- **Debounced Loading**: Use debounced loading state for fast API responses (200ms delay)
  - Prevents visual blinking when navigating between items quickly
  - Only show loading spinner if request takes longer than debounce delay
  - Example: `SongDetailPage` uses `showLoading` state with 200ms debounce
- **Initial Load Messages**: Only show "no data" messages after API response is received
  - Check `data && data.length === 0` in addition to `!isLoading`
  - Prevents premature "no data" messages during initial load

### Search & Filtering

- **Debouncing**: Debounce search inputs (300ms recommended)
- **Pagination**: Use pagination for large result sets
- **Default Limits**: Set reasonable default limits (e.g., 150 songs)

## Authentication & Authorization Rules

### Discord OAuth Flow

1. **User Login**: User clicks login → Redirected to Discord OAuth
2. **Backend Validation**:
   - Check if user is in Discord guild (server)
   - If in guild: Allow login, set `hasEditPermission` based on role presence
   - If not in guild: Reject login with error message
3. **JWT Token**: Includes `hasEditPermission` flag in payload
4. **Frontend Check**: Use `hasEditPermission` from `useAuth()` hook
5. **Backend Guard**: Use `EditPermissionGuard` for protected endpoints

### Permission Levels

- **Anonymous Users**: Can view songs, search, browse
- **Guild Members (without role)**: Can log in, see avatar/menu, but cannot edit/delete/export
- **Guild Members (with role)**: Full access to all features

### Implementation Guidelines

- **Backend**: Always use `EditPermissionGuard` for POST, PATCH, DELETE, and export endpoints
- **Frontend**: Always check `hasEditPermission` before showing edit/delete buttons
- **Error Messages**: Show user-friendly messages in Polish for unauthorized actions
- **User Experience**: All logged-in users should see their avatar and menu, regardless of permissions

---

**Last Updated**: 2025-01-23
**Maintained By**: Development Team
