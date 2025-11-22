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
- **API Calls**: Centralize in service layer, use typed API client

### Sync Tool

- **Idempotency**: Sync operations should be safe to run multiple times
- **Error Recovery**: Log errors but continue processing other songs
- **Dry Run**: Always support dry-run mode for testing
- **Configuration**: Support both config file and environment variables

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
- **Integration Tests**: Test with mock OpenLP DB and API

## Database Rules

### Prisma

- **Migrations**: Always create migrations for schema changes
- **Seeding**: Use Prisma seed for initial data
- **Relations**: Use proper foreign keys, cascade deletes where appropriate
- **Indexes**: Add indexes for frequently queried fields (title, language, tags)

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
- **SQL Injection**: Use Prisma (parameterized queries)
- **CORS**: Configure CORS properly for production
- **Rate Limiting**: Add rate limiting for API endpoints (future)
- **Secrets**: Never commit secrets, use environment variables

### Frontend

- **XSS Prevention**: Sanitize user inputs, use React's built-in escaping
- **API Keys**: Never expose API keys in frontend code
- **Sensitive Data**: Don't store sensitive data in localStorage

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

### Before Committing

1. Run linter and formatter
2. Run tests
3. Check for console.logs or debug code
4. Write clear commit message

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

---

**Last Updated**: 2025-01-XX
**Maintained By**: Development Team
