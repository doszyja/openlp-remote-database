# VPS Deployment Guide

Complete guide for deploying the OpenLP Database Sync project on a Virtual Private Server (VPS).

## 🌐 VPS Information

**VPS URL**: `http://vps-7ac7feb6.vps.ovh.net`

**Note**: This guide uses the actual VPS URL. After SSL setup, all URLs will be updated to HTTPS.

## 📋 Prerequisites

### Server Requirements

- **OS**: Ubuntu 22.04 LTS or Debian 12 (recommended)
- **RAM**: Minimum 2GB (4GB+ recommended)
- **CPU**: 2+ cores
- **Storage**: 20GB+ free space
- **Network**: Public IP address with ports 80, 443 open

### Software Requirements

- Node.js 22+ and pnpm 8+
- MongoDB 7+ (or use Docker)
- Nginx (for reverse proxy)
- Certbot (for SSL certificates)
- PM2 (for process management) - optional if using Docker
- Git

## 🚀 Deployment Options

### Option 1: Docker Deployment (Recommended)

This is the easiest and most reliable method.

#### Step 1: Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group (if not already done)
sudo usermod -aG docker $USER

# Apply group changes without logging out (alternative to logout/login)
newgrp docker

# OR log out and back in for group changes to take effect
# exit
# SSH back in

# Verify installation
docker --version
docker-compose --version

# Test Docker access (should work without sudo)
docker ps
```

#### Step 2: Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/openlp-database
sudo chown $USER:$USER /opt/openlp-database
cd /opt/openlp-database

# Clone repository
git clone https://github.com/doszyja/openlp-remote-database.git .

# Or if you have SSH access:
# git clone git@github.com:doszyja/openlp-remote-database.git .
```

#### Step 3: Configure Environment Variables

```bash
# Create production environment file
cp docker-compose.prod.yml docker-compose.yml
cp .env.example .env

# Edit .env file with your production values
nano .env
```

**Required `.env` variables:**

```env
# MongoDB
MONGO_USER=openlp_admin
MONGO_PASSWORD=your_secure_password_here
MONGO_DB=openlp_db

# API Configuration
API_PORT=3000
# Note: Use HTTP initially, update to HTTPS after SSL setup
CORS_ORIGIN=http://vps-7ac7feb6.vps.ovh.net
JWT_SECRET=your_very_long_random_jwt_secret_here_min_32_chars

# Discord OAuth (Production URLs)
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
# Note: Use HTTP initially, update to HTTPS after SSL setup
DISCORD_CALLBACK_URL=http://vps-7ac7feb6.vps.ovh.net/api/auth/discord/callback
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=your_discord_guild_id
DISCORD_REQUIRED_ROLE_ID=your_discord_role_id

# Frontend
# Note: Use HTTP initially, update to HTTPS after SSL setup
VITE_API_URL=http://vps-7ac7feb6.vps.ovh.net/api
WEB_PORT=80
```

**Important**: 
- Generate a strong `JWT_SECRET`: `openssl rand -base64 32`
- **VPS URL**: `http://vps-7ac7feb6.vps.ovh.net` (update to HTTPS after SSL setup)
- Update Discord OAuth redirect URI in Discord Developer Portal to: `http://vps-7ac7feb6.vps.ovh.net/api/auth/discord/callback` (update to HTTPS after SSL setup)
- After setting up SSL, change all `http://` to `https://` in the `.env` file

#### Step 4: Build and Start Services

```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart
```

#### Step 5: Configure Nginx Reverse Proxy

```bash
# Install Nginx (if not already installed)
sudo apt install nginx -y

# Remove default nginx site (if it exists and shows "Welcome to nginx")
sudo rm /etc/nginx/sites-enabled/default

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/openlp-database
```

**Nginx configuration** (`/etc/nginx/sites-available/openlp-database`):

**For HTTP (initial setup, before SSL):**

```nginx
# HTTP Server (before SSL setup)
server {
    listen 80;
    server_name vps-7ac7feb6.vps.ovh.net;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Frontend (React app)
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
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

**For HTTPS (after SSL setup, replace HTTP config above):**

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

    # SSL certificates (will be added by Certbot)
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

    # Frontend (React app)
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
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

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/openlp-database /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### Step 6: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate for your VPS
sudo certbot --nginx -d vps-7ac7feb6.vps.ovh.net

# Note: If Certbot fails because the domain doesn't resolve properly, you may need to:
# 1. Use HTTP-only setup initially (see Nginx config above)
# 2. Or configure DNS properly if you have a custom domain

# Certbot will automatically configure Nginx and renew certificates
# Test renewal
sudo certbot renew --dry-run
```

#### Step 7: Firewall Configuration

```bash
# Install UFW
sudo apt install ufw -y

# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

#### Step 8: Verify Deployment

1. **Check Docker containers:**
   ```bash
   docker-compose ps
   docker-compose logs api
   docker-compose logs web
   ```

2. **Test API:**
   ```bash
   curl http://localhost:3000/health
   curl http://vps-7ac7feb6.vps.ovh.net/api/health
   # After SSL setup:
   # curl https://vps-7ac7feb6.vps.ovh.net/api/health
   ```

3. **Access frontend:**
   - Open browser: `http://vps-7ac7feb6.vps.ovh.net`
   - Should see the homepage
   - After SSL setup, use: `https://vps-7ac7feb6.vps.ovh.net`

4. **Test Discord OAuth:**
   - Click login button
   - Should redirect to Discord and back

---

### Option 2: Manual Deployment (Without Docker)

For more control or if Docker is not preferred.

#### Step 1: Install Node.js and pnpm

```bash
# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Verify
node --version  # Should be 22.x
pnpm --version  # Should be 8.x
```

#### Step 2: Install MongoDB

```bash
# Import MongoDB GPG key
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
sudo systemctl status mongod
```

#### Step 3: Clone and Build Project

```bash
# Create application directory
sudo mkdir -p /opt/openlp-database
sudo chown $USER:$USER /opt/openlp-database
cd /opt/openlp-database

# Clone repository
git clone https://github.com/doszyja/openlp-remote-database.git .

# Install dependencies
pnpm install

# Build shared package first
pnpm build:shared

# Build all apps
pnpm build:all
```

#### Step 4: Configure Environment Variables

```bash
# Backend environment
cd apps/api
cp .env.example .env
nano .env
```

**`apps/api/.env`:**

```env
DATABASE_URL=mongodb://localhost:27017/openlp_db
PORT=3000
NODE_ENV=production
# Note: Use HTTP initially, update to HTTPS after SSL setup
CORS_ORIGIN=http://vps-7ac7feb6.vps.ovh.net
JWT_SECRET=your_very_long_random_jwt_secret_here
JWT_EXPIRES_IN=7d
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
# Note: Use HTTP initially, update to HTTPS after SSL setup
DISCORD_CALLBACK_URL=http://vps-7ac7feb6.vps.ovh.net/api/auth/discord/callback
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=your_discord_guild_id
DISCORD_REQUIRED_ROLE_ID=your_discord_role_id
```

```bash
# Frontend environment
cd ../web
cp .env.example .env
nano .env
```

**`apps/web/.env`:**

```env
# Note: Use HTTP initially, update to HTTPS after SSL setup
VITE_API_URL=http://vps-7ac7feb6.vps.ovh.net/api
```

#### Step 5: Install PM2 for Process Management

```bash
# Install PM2 globally
npm install -g pm2

# Start backend
cd /opt/openlp-database/apps/api
pm2 start dist/main.js --name "openlp-api" --node-args="--max-old-space-size=512"

# Start frontend (serve built files)
cd /opt/openlp-database/apps/web
# Install serve for static file serving
npm install -g serve
pm2 start serve --name "openlp-web" -- -s dist -l 5173

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown
```

#### Step 6: Configure Nginx

Same as Docker option, but proxy to:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

#### Step 7: Setup SSL

Same as Docker option.

---

## 🔧 Maintenance Commands

### Docker Deployment

```bash
# View logs
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f mongodb

# Restart services
docker-compose restart

# Update application
cd /opt/openlp-database
git pull
docker-compose up -d --build

# Backup MongoDB
docker-compose exec mongodb mongodump --out /data/backup

# Restore MongoDB
docker-compose exec mongodb mongorestore /data/backup
```

### Manual Deployment

```bash
# View PM2 logs
pm2 logs openlp-api
pm2 logs openlp-web

# Restart services
pm2 restart openlp-api
pm2 restart openlp-web

# Update application
cd /opt/openlp-database
git pull
pnpm install
pnpm build:all
pm2 restart all

# Backup MongoDB
mongodump --out /opt/backups/mongodb-$(date +%Y%m%d)

# Restore MongoDB
mongorestore /opt/backups/mongodb-YYYYMMDD
```

---

## 🔒 Security Checklist

- [ ] Strong MongoDB password set
- [ ] Strong JWT_SECRET (32+ characters)
- [ ] Firewall configured (UFW)
- [ ] SSL certificate installed and auto-renewing
- [ ] Discord OAuth redirect URI updated to production URL
- [ ] Environment variables not committed to git
- [ ] MongoDB not exposed to public internet
- [ ] Regular backups configured
- [ ] System updates automated
- [ ] SSH key authentication (disable password auth)

---

## 🐛 Troubleshooting

### Docker Permission Denied Error

If you see: `permission denied while trying to connect to the Docker daemon socket`

**Solution:**

```bash
# 1. Add your user to the docker group (if not already done)
sudo usermod -aG docker $USER

# 2. Apply the group change immediately (choose one method):

# Method A: Use newgrp (applies immediately in current session)
newgrp docker

# Method B: Log out and back in (most reliable)
exit
# Then SSH back into the server

# 3. Verify Docker access works without sudo
docker ps

# 4. If still not working, check group membership
groups
# Should show 'docker' in the list

# 5. If docker group is missing, restart the session
# Or try:
sudo chmod 666 /var/run/docker.sock  # Temporary fix (not recommended for production)
```

**Note**: After adding user to docker group, you MUST either:
- Run `newgrp docker` in the current session, OR
- Log out and SSH back in

The group change only takes effect in new sessions.

### API not responding

```bash
# Check if service is running
docker-compose ps  # or pm2 list

# Check logs
docker-compose logs api  # or pm2 logs openlp-api

# Check if port is in use
sudo netstat -tlnp | grep 3000
```

### Frontend not loading

```bash
# Check if service is running
docker-compose ps  # or pm2 list

# Check Nginx configuration
sudo nginx -t
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### MongoDB connection issues

```bash
# Check MongoDB status
sudo systemctl status mongod  # or docker-compose ps mongodb

# Test connection
mongosh "mongodb://localhost:27017/openlp_db"

# Check MongoDB logs
sudo journalctl -u mongod -f  # or docker-compose logs mongodb
```

### SSL certificate issues

```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check Nginx SSL configuration
sudo nginx -t
```

---

## 📊 Monitoring

### Docker

```bash
# Resource usage
docker stats

# Container health
docker-compose ps
```

### Manual

```bash
# PM2 monitoring
pm2 monit

# System resources
htop
```

---

## 🔄 Updates and Upgrades

### Update Application

```bash
cd /opt/openlp-database
git pull origin main
docker-compose up -d --build  # or pnpm build:all && pm2 restart all
```

### Update System

```bash
sudo apt update && sudo apt upgrade -y
sudo reboot  # if kernel updates
```

---

## 📝 Notes

- Always test in staging before production
- Keep backups of MongoDB data
- Monitor disk space (MongoDB can grow)
- Set up log rotation
- Consider using a process manager like PM2 even with Docker for additional monitoring
- Use environment-specific configurations

---

**Last Updated**: 2025-01-22

