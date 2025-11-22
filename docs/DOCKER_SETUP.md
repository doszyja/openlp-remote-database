# Docker Setup Guide

This guide explains how to set up and run the OpenLP Database Sync application using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git

## Quick Start (Development)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd openlp-database
   ```

2. **Create environment files**
   ```bash
   # Copy example env files
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

3. **Configure environment variables**
   
   Edit `apps/api/.env`:
   ```env
   DATABASE_URL=postgresql://openlp:openlp_password@postgres:5432/openlp_db
   PORT=3000
   CORS_ORIGIN=http://localhost:5173
   ```

   Edit `apps/web/.env`:
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```

4. **Start services**
   ```bash
   docker-compose up -d
   ```

5. **Run database migrations**
   ```bash
   docker-compose exec api pnpm prisma migrate dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - API Docs: http://localhost:3000/api/docs

## Development Workflow

### Start Services
```bash
docker-compose up
```

### Start in Background
```bash
docker-compose up -d
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f postgres
```

### Stop Services
```bash
docker-compose down
```

### Stop and Remove Volumes
```bash
docker-compose down -v
```

### Rebuild Services
```bash
# Rebuild all
docker-compose build

# Rebuild specific service
docker-compose build api
docker-compose build web
```

### Execute Commands in Containers
```bash
# Run Prisma migrations
docker-compose exec api pnpm prisma migrate dev

# Run Prisma Studio
docker-compose exec api pnpm prisma studio

# Access database
docker-compose exec postgres psql -U openlp -d openlp_db

# Run tests
docker-compose exec api pnpm test
```

## Production Deployment

### 1. Prepare Environment Variables

Create `.env` file in project root:

```env
# Database
POSTGRES_USER=openlp
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=openlp_db

# API
API_PORT=3000
CORS_ORIGIN=https://yourdomain.com
JWT_SECRET=your_jwt_secret
DATABASE_URL=postgresql://openlp:your_secure_password@postgres:5432/openlp_db

# Discord OAuth (Phase 2)
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_CALLBACK_URL=https://yourdomain.com/auth/discord/callback
DISCORD_GUILD_ID=your_discord_guild_id
DISCORD_REQUIRED_ROLE_ID=your_discord_role_id

# Frontend
VITE_API_URL=https://api.yourdomain.com/api
WEB_PORT=80
```

### 2. Build and Start Production Services

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec api pnpm prisma migrate deploy
```

### 3. Verify Services

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Docker Compose Services

### PostgreSQL
- **Image**: `postgres:16-alpine`
- **Port**: `5432` (mapped to host)
- **Volume**: `postgres_data` (persistent data)
- **Health Check**: Checks if database is ready

### NestJS API
- **Build**: Multi-stage Dockerfile
- **Port**: `3000` (mapped to host)
- **Hot Reload**: Enabled in development via volume mounts
- **Health Check**: `/health` endpoint

### React Frontend
- **Build**: Multi-stage Dockerfile with nginx
- **Port**: `80` (production) or `5173` (development)
- **Serves**: Static files via nginx
- **Health Check**: HTTP check on root

## Dockerfile Details

### Backend Dockerfile (Multi-stage)

1. **Dependencies Stage**: Installs all dependencies
2. **Build Stage**: Compiles TypeScript to JavaScript
3. **Production Stage**: Only production dependencies and built files

### Frontend Dockerfile (Multi-stage)

1. **Dependencies Stage**: Installs all dependencies
2. **Build Stage**: Builds React app with Vite
3. **Production Stage**: Serves static files with nginx

## Volume Mounts

### Development
- Source code mounted for hot reload
- `node_modules` excluded via anonymous volumes

### Production
- No source code mounts
- Only built artifacts in containers

## Networking

All services are on the same Docker network (`openlp-network`), allowing them to communicate using service names:
- `postgres` - Database hostname
- `api` - Backend API hostname
- `web` - Frontend hostname

## Database Management

### Run Migrations
```bash
docker-compose exec api pnpm prisma migrate dev
```

### Prisma Studio
```bash
docker-compose exec api pnpm prisma studio
# Access at http://localhost:5555
```

### Backup Database
```bash
docker-compose exec postgres pg_dump -U openlp openlp_db > backup.sql
```

### Restore Database
```bash
docker-compose exec -T postgres psql -U openlp openlp_db < backup.sql
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
netstat -ano | findstr :3000  # Windows
lsof -i :3000                  # Linux/Mac

# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use different host port
```

### Database Connection Issues
```bash
# Check if database is healthy
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Verify connection string
docker-compose exec api node -e "console.log(process.env.DATABASE_URL)"
```

### Build Failures
```bash
# Clean build
docker-compose build --no-cache

# Check build logs
docker-compose build api 2>&1 | tee build.log
```

### Permission Issues (Linux)
```bash
# Fix ownership
sudo chown -R $USER:$USER .

# Or run with sudo (not recommended)
sudo docker-compose up
```

### Container Won't Start
```bash
# Check logs
docker-compose logs <service-name>

# Check container status
docker-compose ps

# Inspect container
docker inspect <container-name>
```

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@postgres:5432/dbname
PORT=3000
NODE_ENV=development|production
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your_secret
# Discord OAuth variables...
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api
```

### Docker Compose
Environment variables can be set in:
1. `.env` file in project root
2. `docker-compose.yml` environment section
3. System environment variables

## Security Considerations

### Production Checklist
- [ ] Use strong passwords for database
- [ ] Set secure JWT secret
- [ ] Don't expose database port publicly
- [ ] Use HTTPS in production
- [ ] Set proper CORS origins
- [ ] Keep Docker images updated
- [ ] Use secrets management (Docker secrets, etc.)
- [ ] Enable firewall rules
- [ ] Regular backups

### Secrets Management
For production, consider using:
- Docker secrets
- Environment variable files with restricted permissions
- External secret management (AWS Secrets Manager, etc.)

## Performance Optimization

### Build Cache
```bash
# Use build cache
docker-compose build --parallel

# Clear cache if needed
docker builder prune
```

### Image Size
- Using Alpine Linux images reduces size
- Multi-stage builds exclude dev dependencies
- .dockerignore files exclude unnecessary files

## Monitoring

### Health Checks
All services have health checks configured:
- PostgreSQL: `pg_isready`
- API: HTTP `/health` endpoint
- Frontend: HTTP root check

### View Health Status
```bash
docker-compose ps
```

## Updating Services

```bash
# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build

# Run migrations if needed
docker-compose exec api pnpm prisma migrate deploy
```

## Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (⚠️ deletes data)
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Full cleanup
docker system prune -a
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Node.js Docker Image](https://hub.docker.com/_/node)
- [Nginx Docker Image](https://hub.docker.com/_/nginx)

---

**Last Updated**: 2025-01-XX

