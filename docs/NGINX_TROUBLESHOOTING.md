# Nginx Troubleshooting Guide

## Problem: API calls return nginx "not found" page

When accessing `http://vps-7ac7feb6.vps.ovh.net/api/songs`, you get an nginx 404 page instead of the API response.

## Diagnosis Steps

### 1. Check if API container is running

```bash
# SSH into your VPS
ssh user@vps-7ac7feb6.vps.ovh.net

# Check if API container is running
docker ps | grep openlp-api-prod

# Check API container logs
docker logs openlp-api-prod

# Test API directly (bypassing nginx)
curl http://localhost:3000/api/songs
```

### 2. Check nginx configuration

```bash
# View current nginx config
sudo cat /etc/nginx/sites-available/openlp-database

# Or if using sites-enabled
sudo cat /etc/nginx/sites-enabled/openlp-database

# Test nginx configuration
sudo nginx -t

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### 3. Check if port 3000 is accessible

```bash
# Check if port 3000 is listening
sudo netstat -tlnp | grep 3000
# or
sudo ss -tlnp | grep 3000

# Test from localhost
curl -v http://localhost:3000/api/songs
```

## Solution: Correct Nginx Configuration

The issue is that NestJS uses `setGlobalPrefix('api')`, so all routes are at `/api/songs`, `/api/health`, etc.

**The nginx config should NOT strip the `/api` prefix** because NestJS expects it.

### Correct Configuration

**For HTTP (port 80):**

```nginx
server {
    listen 80;
    server_name vps-7ac7feb6.vps.ovh.net;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Frontend (React app) - proxy to Docker container on port 8080
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API - forward /api/* to http://localhost:3000/api/*
    # DO NOT strip /api prefix because NestJS expects it
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for long-running requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

**For HTTPS (port 443):**

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name vps-7ac7feb6.vps.ovh.net;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name vps-7ac7feb6.vps.ovh.net;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/vps-7ac7feb6.vps.ovh.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vps-7ac7feb6.vps.ovh.net/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Frontend (React app) - proxy to Docker container on port 8080
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API - forward /api/* to http://localhost:3000/api/*
    # DO NOT strip /api prefix because NestJS expects it
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for long-running requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

## How to Apply the Fix

1. **Edit the nginx configuration:**

```bash
sudo nano /etc/nginx/sites-available/openlp-database
```

2. **Update the `/api` location block** to use:
   ```nginx
   location /api {
       proxy_pass http://localhost:3000;
       # ... rest of config
   }
   ```
   
   **NOT:**
   ```nginx
   location /api/ {
       proxy_pass http://localhost:3000/;  # This strips /api prefix - WRONG!
   }
   ```

3. **Test the configuration:**

```bash
sudo nginx -t
```

4. **If test passes, reload nginx:**

```bash
sudo systemctl reload nginx
```

5. **Verify it works:**

```bash
curl http://vps-7ac7feb6.vps.ovh.net/api/songs?page=1&limit=200
```

## Key Points

- **NestJS has `setGlobalPrefix('api')`** - all routes are at `/api/*`
- **Nginx should forward `/api/*` to `http://localhost:3000/api/*`** (keep the prefix)
- **Use `location /api` with `proxy_pass http://localhost:3000`** (no trailing slashes)
- **DO NOT use `location /api/` with `proxy_pass http://localhost:3000/`** (this strips the prefix)

## Alternative: Remove Global Prefix from NestJS

If you prefer to strip the prefix in nginx, you would need to:

1. Remove `app.setGlobalPrefix('api')` from `apps/api/src/main.ts`
2. Use `location /api/ { proxy_pass http://localhost:3000/; }` in nginx

But the recommended approach is to keep the prefix in NestJS and forward it through nginx.

