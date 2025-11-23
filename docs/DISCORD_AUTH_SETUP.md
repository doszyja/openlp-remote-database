# Discord Authentication Setup Guide

This guide explains how to set up Discord OAuth authentication with server and role restrictions.

## Overview

The application uses Discord OAuth to authenticate users. Only users who are:
1. Members of a specific Discord server (guild)
2. Have a specific role in that server

will be allowed to log in.

## Prerequisites

- A Discord application
- A Discord bot added to your server
- Bot permissions to read member roles

## Step 1: Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "OpenLP Song Database")
4. Go to the "OAuth2" section
5. Under "Redirects", add **exactly** this URL (case-sensitive, must match exactly):
   - `http://localhost:3000/api/auth/discord/callback` (for development)
   - `https://yourdomain.com/api/auth/discord/callback` (for production)
6. **IMPORTANT**: The redirect URI must match exactly what's in your `.env` file or the default in the code
7. Copy the **Client ID** and **Client Secret**

## Step 2: Create a Discord Bot

1. In your Discord application, go to the "Bot" section
2. Click "Add Bot"
3. Under "Privileged Gateway Intents", enable:
   - **Server Members Intent** (required to read member roles)
4. Copy the **Bot Token**

## Step 3: Add Bot to Your Server

1. In the "OAuth2" → "URL Generator" section
2. Select scopes:
   - `bot` (required to add bot to server)
3. Select bot permissions:
   - **View Server Members** (required to read member roles)
4. Copy the generated URL and open it in your browser
5. Select your server and authorize the bot

**Note**: The user authentication OAuth flow only requires the `identify` scope (configured in code). The `bot` scope is only needed when adding the bot to your server using the URL Generator.

## Step 4: Get Server (Guild) ID

1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click on your server name
3. Click "Copy Server ID"
4. This is your `DISCORD_GUILD_ID`

## Step 5: Get Role ID

1. In your Discord server, go to Server Settings → Roles
2. Find the role you want to require for login
3. Right-click on the role name
4. Click "Copy Role ID"
5. This is your `DISCORD_REQUIRED_ROLE_ID`

## Step 6: Configure Environment Variables

Add the following to your `.env` file in the `apps/api` directory:

```env
# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_CALLBACK_URL=http://localhost:3000/api/auth/discord/callback
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=your_discord_guild_id
DISCORD_REQUIRED_ROLE_ID=your_discord_role_id

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:5173
```

## Step 7: Update Frontend Environment

In `apps/web/.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

## How It Works

1. User clicks "Login with Discord" on the frontend
2. User is redirected to Discord OAuth page
3. User authorizes the application
4. Discord redirects back to `/api/auth/discord/callback`
5. Backend validates:
   - User is in the required Discord server
   - User has the required role
6. If valid, a JWT token is generated and user is redirected to frontend
7. Frontend stores the token in localStorage and fetches user profile
8. **All subsequent API requests automatically include the token** in the `Authorization: Bearer <token>` header via the API service (`apps/web/src/services/api.ts`)

## Troubleshooting

### "User not authorized - missing role or not in server"

- Verify the user is actually in the Discord server
- Verify the user has the required role
- Check that `DISCORD_GUILD_ID` and `DISCORD_REQUIRED_ROLE_ID` are correct
- Ensure the bot has "Server Members Intent" enabled
- Ensure the bot has permission to read member roles

### "Discord API error: 403"

- Check that the bot token is correct
- Verify the bot is in the server
- Ensure the bot has the required permissions

### "Discord configuration missing"

- Verify all Discord environment variables are set
- Check that `.env` file is in the correct location (`apps/api/.env`)

### "Nieprawidłowy parametr redirect_uri OAuth2" or "Invalid redirect_uri OAuth2 parameter"

This error means the redirect URI in your Discord application settings doesn't match what the code is sending.

**To fix:**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to "OAuth2" → "General"
4. Under "Redirects", make sure you have **exactly** this URL:
   - `http://localhost:3000/api/auth/discord/callback`
5. Check your `.env` file in `apps/api/.env` and ensure:
   ```env
   DISCORD_CALLBACK_URL=http://localhost:3000/api/auth/discord/callback
   ```
6. **Important**: The URL must match exactly (including `http://` vs `https://`, port number, and path)
7. After updating, restart your API server

## Security Notes

- Never commit `.env` files to version control
- Use strong, random values for `JWT_SECRET`
- In production, use HTTPS for all OAuth callbacks
- Regularly rotate bot tokens and secrets
