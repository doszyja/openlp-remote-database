# Multi-stage Dockerfile for React Frontend

# Stage 1: Dependencies
FROM node:22-alpine AS dependencies

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies (allow lockfile update if needed)
RUN pnpm install --no-frozen-lockfile

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
COPY apps/web ./apps/web
COPY packages ./packages

# Set build arguments for environment variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build shared package first, then web
RUN pnpm --filter @openlp/shared build
# Install vite if needed, then build web
RUN pnpm add -D -w vite @vitejs/plugin-react || true
RUN pnpm --filter web build

# Stage 3: Production (nginx)
FROM nginx:alpine AS production

# Copy built files from build stage
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

