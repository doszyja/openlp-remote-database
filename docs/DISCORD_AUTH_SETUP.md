# Discord OAuth Authentication Setup Guide

This guide explains how to set up Discord OAuth authentication for the OpenLP Database Sync project.

## Overview

The application uses Discord OAuth 2.0 for authentication. Users log in with their Discord account, and only users with a specific role in your Discord server can access the application.

## Prerequisites

1. A Discord account
2. A Discord server where you want to manage access
3. Administrator or "Manage Server" permission on the Discord server

## Step 1: Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "OpenLP Song Manager")
4. Click "Create"

## Step 2: Configure OAuth2

1. In your application, go to the **OAuth2** section in the left sidebar
2. Under **Redirects**, add your callback URLs:
   - Development: `http://localhost:5173/auth/discord/callback`
   - Production: `https://yourdomain.com/auth/discord/callback`
3. Copy your **Client ID** and **Client Secret** (you'll need these for environment variables)
4. Under **OAuth2 URL Generator**:
   - Select scopes: `identify`, `guilds`, `guilds.members.read`
   - Copy the generated URL (for testing)

## Step 3: Create Discord Bot (Optional but Recommended)

A bot is needed to check user roles in your Discord server.

1. In your application, go to the **Bot** section
2. Click "Add Bot"
3. Under **Privileged Gateway Intents**, enable:
   - **Server Members Intent** (required to check roles)
4. Copy the **Bot Token** (you'll need this)
5. Under **OAuth2 URL Generator**:
   - Select scopes: `bot`
   - Select permissions: `Read Members` (or minimal permissions)
   - Copy the generated invite URL
6. Open the invite URL in a browser
7. Select your Discord server
8. Authorize the bot

## Step 4: Get Discord Server and Role IDs

### Get Server (Guild) ID

1. Enable Developer Mode in Discord:
   - User Settings → Advanced → Developer Mode
2. Right-click on your Discord server name
3. Click "Copy Server ID"
4. This is your `DISCORD_GUILD_ID`

### Get Role ID

1. In Discord, go to Server Settings → Roles
2. Find the role you want to use for access (or create a new one)
3. Right-click on the role
4. Click "Copy Role ID"
5. This is your `DISCORD_REQUIRED_ROLE_ID`

**Note**: You can create a role specifically for this app (e.g., "Song Editor" or "OpenLP Access")

## Step 5: Configure Environment Variables

Add these to your backend `.env` file:

```env
# Discord OAuth
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_CALLBACK_URL=http://localhost:5173/auth/discord/callback
DISCORD_GUILD_ID=your_server_id_here
DISCORD_REQUIRED_ROLE_ID=your_role_id_here

# Optional: Bot token (if using bot for role checking)
DISCORD_BOT_TOKEN=your_bot_token_here

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
```

## Step 6: OAuth Flow

### How It Works

1. **User clicks "Login with Discord"**
   - Frontend redirects to: `GET /auth/discord`
   - Backend redirects to Discord OAuth authorization page

2. **User authorizes on Discord**
   - Discord shows authorization page
   - User clicks "Authorize"

3. **Discord redirects back**
   - Discord redirects to: `GET /auth/discord/callback?code=...`
   - Backend receives authorization code

4. **Backend exchanges code for token**
   - Backend calls Discord API to exchange code for access token
   - Backend uses access token to fetch user info

5. **Backend verifies role**
   - Backend checks if user is in the Discord server
   - Backend checks if user has the required role
   - If not authorized, return error

6. **Backend creates/updates user**
   - Create or update user in database
   - Store Discord ID, username, avatar, roles

7. **Backend issues JWT**
   - Generate JWT token with user info
   - Set httpOnly cookie or return token

8. **Frontend receives token**
   - Store token (cookie or localStorage)
   - Redirect to application
   - User is now authenticated

## Implementation Details

### Required Discord Scopes

- `identify`: Get user's basic information (username, avatar, ID)
- `guilds`: Get list of servers user is in
- `guilds.members.read`: Read member information (for role checking)

### Role Verification Methods

**Method 1: Using OAuth Token (Recommended)**
- Use the OAuth access token to call Discord API
- Endpoint: `GET /users/@me/guilds/{guild_id}/member`
- Check if user has the required role in the response

**Method 2: Using Bot (Alternative)**
- Bot can check member roles directly
- Requires bot to be in the server
- More reliable but requires bot setup

### Database Schema

```prisma
model User {
  id          String   @id @default(uuid())
  discordId   String   @unique
  username    String
  avatar      String?
  discordRoles Json?   // Store roles as JSON array
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Security Considerations

1. **Keep secrets secure**: Never commit Client Secret or Bot Token to version control
2. **Use httpOnly cookies**: More secure than localStorage for JWT tokens
3. **Validate roles on each request**: Or cache and refresh periodically
4. **Handle token expiration**: Re-authenticate or refresh tokens
5. **Rate limiting**: Discord API has rate limits, implement caching

## Testing

### Test OAuth Flow Locally

1. Start backend: `pnpm dev:api`
2. Start frontend: `pnpm dev:web`
3. Navigate to login page
4. Click "Login with Discord"
5. Authorize on Discord
6. Should redirect back and be logged in

### Test Role Verification

1. Test with user who has the role → Should succeed
2. Test with user who doesn't have the role → Should fail with clear message
3. Test with user not in server → Should fail

## Troubleshooting

### "Invalid redirect URI"
- Check that callback URL in Discord app matches exactly
- Check environment variable `DISCORD_CALLBACK_URL`

### "Missing permissions"
- Ensure bot has "Server Members Intent" enabled
- Ensure bot is in the Discord server
- Check bot permissions

### "User not authorized"
- Verify user is in the Discord server
- Verify user has the required role
- Check role ID is correct in environment variables

### "Rate limited"
- Discord API has rate limits
- Implement caching for role checks
- Use exponential backoff for retries

## Production Checklist

- [ ] Discord application created
- [ ] OAuth redirect URLs configured for production
- [ ] Bot created and invited to server
- [ ] Server Members Intent enabled
- [ ] Role created and ID copied
- [ ] Environment variables set in production
- [ ] JWT secret is strong and secure
- [ ] httpOnly cookies configured (if using)
- [ ] CORS configured for production domain
- [ ] Error handling for unauthorized users
- [ ] Logging for auth events

## Additional Resources

- [Discord OAuth2 Documentation](https://discord.com/developers/docs/topics/oauth2)
- [Discord API Documentation](https://discord.com/developers/docs/resources)
- [passport-discord npm package](https://www.npmjs.com/package/passport-discord)

---

**Last Updated**: 2025-01-XX

