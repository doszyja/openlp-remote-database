# Architecture Decision Records (ADRs)

This document records important architectural decisions made during the project.

## ADR-001: Monorepo Structure with pnpm

**Status**: Accepted  
**Date**: 2025-01-XX  
**Context**: Need to manage multiple related applications (backend, frontend, sync tool) with shared code.

**Decision**: Use pnpm workspaces in a monorepo structure.

**Rationale**:
- Single repository for easier development and versioning
- Shared types package reduces duplication
- pnpm is faster and more efficient than npm/yarn
- Workspace protocol simplifies internal dependencies

**Consequences**:
- ✅ Easier code sharing
- ✅ Single source of truth for versions
- ✅ Simplified development workflow
- ⚠️ Requires pnpm installation
- ⚠️ Slightly more complex CI/CD setup

---

## ADR-002: Prisma as ORM

**Status**: Accepted  
**Date**: 2025-01-XX  
**Context**: Need an ORM for TypeScript/NestJS backend with PostgreSQL.

**Decision**: Use Prisma as the ORM.

**Rationale**:
- Excellent TypeScript support with type safety
- Great developer experience (migrations, Prisma Studio)
- Modern and actively maintained
- Better than TypeORM for our use case

**Consequences**:
- ✅ Type-safe database queries
- ✅ Automatic migrations
- ✅ Prisma Studio for database inspection
- ⚠️ Learning curve if team unfamiliar
- ⚠️ Less flexible than raw SQL for complex queries

---

## ADR-003: PostgreSQL for Production Database

**Status**: Accepted  
**Date**: 2025-01-XX  
**Context**: Need a production-ready relational database for the backend.

**Decision**: Use PostgreSQL for production, SQLite for local development.

**Rationale**:
- Production-ready and battle-tested
- Better concurrent access than SQLite
- Supports complex queries and indexes
- SQLite sufficient for local development

**Consequences**:
- ✅ Production-ready scalability
- ✅ Better performance for concurrent users
- ⚠️ Requires PostgreSQL setup in production
- ⚠️ Different DBs for dev/prod (mitigated by Prisma)

---

## ADR-004: One-Way Sync (Backend → OpenLP)

**Status**: Accepted  
**Date**: 2025-01-XX  
**Context**: Need to sync backend database with OpenLP SQLite database.

**Decision**: Implement one-way sync from backend to OpenLP for MVP.

**Rationale**:
- Backend is the source of truth
- Prevents conflicts and complexity
- Simpler to implement and test
- OpenLP is read-only during services anyway

**Consequences**:
- ✅ Simpler implementation
- ✅ No conflict resolution needed
- ✅ Clear data flow
- ⚠️ Cannot import changes from OpenLP (acceptable for MVP)
- ⚠️ Two-way sync is Phase 2 feature

---

## ADR-005: Store Backend UUID in OpenLP Comments Field

**Status**: Accepted  
**Date**: 2025-01-XX  
**Context**: Need to map backend UUIDs to OpenLP integer IDs for sync.

**Decision**: Store backend UUID in OpenLP's `comments` field as JSON metadata.

**Rationale**:
- No schema changes required to OpenLP
- Simple to implement
- Comments field is available and typically unused
- Can migrate to mapping table later if needed

**Consequences**:
- ✅ No OpenLP schema modifications
- ✅ Simple implementation
- ⚠️ Comments field might be used for other purposes (check first)
- ⚠️ Less clean than dedicated mapping table

**Alternative Considered**: Create custom mapping table in OpenLP DB. Rejected because it requires schema modification.

---

## ADR-006: React Query for Server State Management

**Status**: Accepted  
**Date**: 2025-01-XX  
**Context**: Need to manage server state (API calls) in React frontend.

**Decision**: Use React Query (TanStack Query) for server state management.

**Rationale**:
- Excellent caching and synchronization
- Built-in loading and error states
- Automatic refetching and invalidation
- Better than manual useState/useEffect

**Consequences**:
- ✅ Less boilerplate code
- ✅ Better UX with caching
- ✅ Automatic background updates
- ⚠️ Additional dependency
- ⚠️ Learning curve if team unfamiliar

**Alternative Considered**: SWR. Both are good choices, React Query chosen for better mutation handling.

---

## ADR-007: Material UI for Styling

**Status**: Accepted  
**Date**: 2025-01-XX  
**Context**: Need a styling solution for mobile-friendly React frontend.

**Decision**: Use Material UI (MUI) for styling and components.

**Rationale**:
- Comprehensive component library
- Built-in mobile responsiveness
- Consistent Material Design system
- Excellent TypeScript support
- Rich set of pre-built components (forms, tables, dialogs, etc.)
- Theming support for customization
- Active community and maintenance

**Consequences**:
- ✅ Fast development with pre-built components
- ✅ Consistent Material Design look and feel
- ✅ Mobile-responsive out of the box
- ✅ Less custom CSS needed
- ⚠️ Larger bundle size (can be mitigated with tree-shaking)
- ⚠️ Learning curve for MUI component API
- ⚠️ Less flexibility than utility-first CSS for custom designs

**Alternatives Considered**:
- Tailwind CSS: Rejected - Material UI provides more ready-to-use components
- CSS Modules: Rejected - More manual work, no component library
- Styled Components: Rejected - Material UI has better component ecosystem

---

## ADR-008: No Authentication in MVP

**Status**: Accepted  
**Date**: 2025-01-XX  
**Context**: Need to decide on authentication for Phase 1.

**Decision**: Skip authentication for MVP, add in Phase 2.

**Rationale**:
- Faster time to market
- Church environment may not need strict auth initially
- Can add shared password or simple auth later
- Focus on core functionality first

**Consequences**:
- ✅ Faster development
- ✅ Simpler initial setup
- ⚠️ No access control (acceptable for MVP)
- ⚠️ Must add auth before production use

---

## ADR-013: Discord OAuth for Authentication

**Status**: Accepted  
**Date**: 2025-01-XX  
**Context**: Need authentication system for Phase 2. Want to leverage existing Discord server for user management.

**Decision**: Use Discord OAuth 2.0 for authentication with role-based access control.

**Rationale**:
- Leverages existing Discord community/server
- No need to manage user accounts and passwords
- Discord roles provide natural access control
- Users already familiar with Discord
- OAuth 2.0 is industry standard
- Discord API provides user info (username, avatar)

**Consequences**:
- ✅ No password management needed
- ✅ Easy user onboarding (just Discord login)
- ✅ Role-based access via Discord server roles
- ✅ User info (avatar, username) from Discord
- ⚠️ Requires Discord server and bot setup
- ⚠️ Users must have Discord account
- ⚠️ Dependency on Discord API availability
- ⚠️ Need to handle Discord API rate limits

**Implementation Details**:
- Use `passport-discord` for NestJS
- Verify user has specific Discord server role
- Store Discord user ID in database
- Issue JWT tokens after successful Discord auth
- Refresh tokens if needed (Discord tokens expire)

**Alternatives Considered**:
- Email/password auth: Rejected - requires user management
- Google OAuth: Rejected - Discord is preferred for this use case
- Simple shared password: Rejected - not secure enough

---

## ADR-009: REST API (Not GraphQL)

**Status**: Accepted  
**Date**: 2025-01-XX  
**Context**: Need to choose API style for backend.

**Decision**: Use REST API, GraphQL as future consideration.

**Rationale**:
- Simpler to implement
- Better tooling and documentation (Swagger)
- Easier for sync tool to consume
- GraphQL can be added later if needed

**Consequences**:
- ✅ Simpler implementation
- ✅ Better documentation with Swagger
- ✅ Easier for sync tool
- ⚠️ More endpoints than GraphQL
- ⚠️ Potential over-fetching (acceptable for our use case)

---

## ADR-010: Soft Deletes for Songs

**Status**: Pending  
**Date**: 2025-01-XX  
**Context**: How to handle song deletions?

**Decision**: Use soft deletes (add `deletedAt` field) instead of hard deletes.

**Rationale**:
- Allows recovery of accidentally deleted songs
- Better audit trail
- Can sync deletions to OpenLP or mark as deleted

**Consequences**:
- ✅ Data recovery possible
- ✅ Better audit trail
- ⚠️ Need to filter deleted songs in queries
- ⚠️ Slightly more complex queries

**Note**: This is a recommendation, can be implemented later if needed.

---

## ADR-011: Vite for Frontend Build Tool

**Status**: Accepted  
**Date**: 2025-01-XX  
**Context**: Need a build tool for React frontend.

**Decision**: Use Vite instead of Create React App or Webpack.

**Rationale**:
- Much faster development server
- Modern tooling
- Better TypeScript support
- Smaller bundle sizes

**Consequences**:
- ✅ Fast development experience
- ✅ Modern tooling
- ✅ Better performance
- ⚠️ Less mature than CRA (but stable enough)

---

## ADR-012: better-sqlite3 for Sync Tool

**Status**: Accepted  
**Date**: 2025-01-XX  
**Context**: Need to read/write SQLite in Node.js sync tool.

**Decision**: Use better-sqlite3 instead of sqlite3.

**Rationale**:
- Synchronous API (simpler for CLI tool)
- Better performance
- No native compilation issues
- Actively maintained

**Consequences**:
- ✅ Simpler synchronous API
- ✅ Better performance
- ✅ Fewer installation issues
- ⚠️ Synchronous (acceptable for CLI tool)

---

## Template for New ADRs

When making a new architectural decision, add an ADR using this template:

```markdown
## ADR-XXX: [Title]

**Status**: [Proposed | Accepted | Rejected | Deprecated]  
**Date**: YYYY-MM-DD  
**Context**: [Describe the issue and context]

**Decision**: [State the decision]

**Rationale**:
- [Reason 1]
- [Reason 2]

**Consequences**:
- ✅ [Positive consequence]
- ⚠️ [Negative consequence or trade-off]

**Alternatives Considered**:
- [Alternative 1]: [Why rejected]
- [Alternative 2]: [Why rejected]
```

---

**Last Updated**: 2025-01-XX

