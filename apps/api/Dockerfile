# Multi-stage Dockerfile for NestJS Backend

# Stage 1: Dependencies
FROM node:22-alpine AS dependencies

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies (allow lockfile update if needed)
RUN pnpm install

# Stage 2: Build
FROM node:22-alpine AS build

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.json ./tsconfig.json

# Copy dependencies from previous stage (pnpm hoists to root)
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY apps/api ./apps/api
COPY packages ./packages

# Build shared package first, then API  
RUN pnpm --filter @openlp/shared build
# Install @nestjs/cli if not present, then build
RUN pnpm add -D -w @nestjs/cli || true
RUN pnpm --filter api build

# Stage 3: Production
FROM node:22-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install only production dependencies (allow lockfile update if needed)
RUN pnpm install --prod

# Copy built application
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

# Set NODE_PATH to include root node_modules for workspace resolution
# pnpm hoists dependencies to root, so we need to tell Node.js where to find them
ENV NODE_PATH=/app/node_modules:/app/apps/api/node_modules

# Keep working directory at root for pnpm workspace resolution
WORKDIR /app

# Expose port
EXPOSE 3000

# Health check (use pnpm exec to ensure proper module resolution)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD pnpm exec node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application using pnpm exec for proper module resolution
CMD ["pnpm", "exec", "node", "apps/api/dist/main.js"]

