# OpenLP Database Sync

A web-based song management system for churches using OpenLP projection software. This monorepo contains a NestJS backend, React frontend, and a sync tool for OpenLP integration.

## 🎯 Project Overview

This project enables collaborative song editing through a web application, with automatic synchronization to OpenLP's SQLite database. The backend PostgreSQL database serves as the single source of truth, and a CLI sync tool keeps OpenLP up to date.

### Key Features

- **Web Application**: Mobile-friendly React app for editing songs from phones/browsers
- **REST API**: NestJS backend with PostgreSQL database
- **Sync Tool**: CLI application that syncs backend → OpenLP SQLite
- **Monorepo**: pnpm workspaces with shared TypeScript types

## 📁 Project Structure

```
openlp-database/
├── apps/
│   ├── api/          # NestJS backend
│   ├── web/           # React + Vite frontend
│   └── sync/          # OpenLP sync CLI tool
├── packages/
│   └── shared/        # Shared TypeScript types
├── docs/              # Project documentation
└── README.md
```

## 🚀 Quick Start

### Option 1: Docker (Recommended)

1. **Prerequisites**: Docker and Docker Compose installed

2. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd openlp-database
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

3. **Start services**:
   ```bash
   docker-compose up -d
   ```

4. **Run migrations**:
   ```bash
   docker-compose exec api pnpm prisma migrate dev
   ```

5. **Access**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - API Docs: http://localhost:3000/api/docs

See [Docker Setup Guide](docs/DOCKER_SETUP.md) for detailed instructions.

### Option 2: Local Development

1. **Prerequisites**:
   - Node.js 18+ and pnpm
   - PostgreSQL (or SQLite for local dev)
   - OpenLP SQLite database file (for sync tool)

2. **Installation**:
   ```bash
   # Clone repository
   git clone <repository-url>
   cd openlp-database
   
   # Install dependencies
   pnpm install
   ```

3. **Set up environment variables**:
   - Copy `.env.example` files in each app
   - Configure database URLs and API endpoints

4. **Set up database**:
   ```bash
   cd apps/api
   pnpm prisma migrate dev
   pnpm prisma generate
   ```

5. **Start development servers**:
   ```bash
   # From root
   pnpm dev:api    # Backend on :3000
   pnpm dev:web    # Frontend on :5173
   ```

## 🤖 Cursor AI Configuration

This project includes `.cursorrules` to help Cursor AI maintain proper context:
- All markdown files (*.md) are automatically included in context
- Project plan and TODO list are prioritized for task tracking
- Architecture and rules are always referenced

## 📚 Documentation

- **[PROJECT_PLAN.md](PROJECT_PLAN.md)** - High-level project plan with epics
- **[DETAILED_TODO.md](docs/DETAILED_TODO.md)** - Granular task breakdown
- **[PROJECT_RULES.md](docs/PROJECT_RULES.md)** - Coding standards and guidelines
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture and design
- **[CONTEXT.md](docs/CONTEXT.md)** - Project context and background
- **[ADRs.md](docs/ADRs.md)** - Architecture Decision Records
- **[MATERIAL_UI_GUIDE.md](docs/MATERIAL_UI_GUIDE.md)** - Material UI implementation guide
- **[DISCORD_AUTH_SETUP.md](docs/DISCORD_AUTH_SETUP.md)** - Discord OAuth setup guide
- **[DOCKER_SETUP.md](docs/DOCKER_SETUP.md)** - Docker and Docker Compose setup guide

## 🛠️ Development

### Workspace Scripts

From the root directory:

```bash
# Development
pnpm dev:api      # Start NestJS backend
pnpm dev:web      # Start React frontend
pnpm dev:sync     # Build sync tool in watch mode

# Building
pnpm build:all    # Build all apps
pnpm build:api    # Build backend only
pnpm build:web    # Build frontend only
pnpm build:sync   # Build sync tool only

# Testing
pnpm test:all     # Run all tests
pnpm test:api     # Test backend
pnpm test:web     # Test frontend
```

### Individual App Scripts

Each app has its own scripts in its `package.json`. See individual READMEs:
- `apps/api/README.md`
- `apps/web/README.md`
- `apps/sync/README.md`

## 🏗️ Architecture

### Backend (NestJS)
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **API**: REST endpoints with Swagger documentation
- **Validation**: class-validator

### Frontend (React)
- **Framework**: React 18 with Vite
- **Routing**: React Router v6
- **State**: React Query for server state
- **Styling**: Material UI (MUI)
- **Forms**: React Hook Form

### Sync Tool (Node CLI)
- **Runtime**: Node.js with TypeScript
- **SQLite**: better-sqlite3
- **HTTP**: axios for API calls
- **CLI**: commander.js

## 🔄 Sync Workflow

1. Users edit songs in the web application
2. Songs are saved to the backend PostgreSQL database
3. Before services, run the sync tool on the church PC
4. Sync tool fetches songs from backend API
5. Sync tool updates OpenLP SQLite database
6. OpenLP now has the latest songs for projection

## 📋 Current Status

**Phase 1 (MVP)**: In Progress
- [x] Project planning and documentation
- [ ] Monorepo setup
- [ ] Backend API
- [ ] Frontend application
- [ ] Sync tool

**Phase 2**: Planned
- Authentication and authorization
- Advanced features
- Production deployment

See [DETAILED_TODO.md](docs/DETAILED_TODO.md) for complete task list.

## 🤝 Contributing

1. Read [PROJECT_RULES.md](docs/PROJECT_RULES.md) for coding standards
2. Check [DETAILED_TODO.md](docs/DETAILED_TODO.md) for available tasks
3. Follow the development workflow
4. Write tests for new features
5. Update documentation as needed

## 📝 License

[Add license information]

## 🙏 Acknowledgments

Built for churches using OpenLP projection software.

---

**Last Updated**: 2025-01-XX

