import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import type { UserResponseDto } from './dto/user-response.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditLogAction } from '../schemas/audit-log.schema';

export interface DiscordProfile {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
}

export interface DiscordGuildMember {
  user?: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
  };
  roles: string[];
  joined_at: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private auditLogService: AuditLogService,
  ) {}

  async validateDiscordUser(
    profile: DiscordProfile,
    accessToken: string,
  ): Promise<UserResponseDto | null> {
    // Check if user is in the required Discord server
    const guildId = process.env.DISCORD_GUILD_ID;
    const requiredRoleId = process.env.DISCORD_REQUIRED_ROLE_ID;

    if (!guildId || !requiredRoleId) {
      throw new Error('Discord configuration missing');
    }

    console.log(
      `[validateDiscordUser] Validating user ${profile.id} (${profile.username})`,
    );
    console.log(
      `[validateDiscordUser] Guild ID: ${guildId}, Required Role ID: ${requiredRoleId}`,
    );

    // Fetch user's guild member info using bot token (has higher rate limits)
    let memberInfo: DiscordGuildMember | null;
    try {
      memberInfo = await this.getGuildMember(guildId, profile.id);
    } catch (error) {
      console.error(
        '[validateDiscordUser] Failed to fetch guild member:',
        error,
      );
      throw error;
    }

    console.log(
      '[validateDiscordUser] Member info:',
      memberInfo
        ? {
            userId: memberInfo.user?.id,
            roles: memberInfo.roles,
            rolesCount: memberInfo.roles?.length || 0,
          }
        : 'null',
    );

    if (!memberInfo) {
      // User is not in the server
      console.warn(
        `[validateDiscordUser] User ${profile.id} is not in the server or bot cannot access member info`,
      );
      console.warn(`[validateDiscordUser] Troubleshooting:`);
      console.warn(`  1. Verify the user is in the Discord server`);
      console.warn(`  2. Verify the bot is in the server`);
      console.warn(
        `  3. Verify Server Members Intent is enabled in Discord Developer Portal`,
      );
      console.warn(`  4. Verify the bot has "View Server Members" permission`);
      console.warn(`  5. Verify DISCORD_GUILD_ID is correct`);
      return null;
    }

    // Check if user has any of the required roles for edit permission
    // Support multiple role IDs (comma-separated or space-separated)
    const allowedRoleIds = requiredRoleId
      .split(/[,\s]+/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    const hasRequiredRole = allowedRoleIds.some((roleId) =>
      memberInfo.roles.includes(roleId),
    );
    console.log(
      `[validateDiscordUser] Allowed role IDs: ${allowedRoleIds.join(', ')}`,
    );
    console.log(
      `[validateDiscordUser] User roles: ${memberInfo.roles.join(', ')}`,
    );
    console.log(
      `[validateDiscordUser] User has required role: ${hasRequiredRole}`,
    );

    // Allow login for all guild members, but set hasEditPermission based on role
    // User is in the server, so allow login even without the required role
    console.log(
      `[validateDiscordUser] User ${profile.id} is in the server. hasEditPermission: ${hasRequiredRole}`,
    );

    // Create or update user in database
    const user = await this.userModel
      .findOneAndUpdate(
        { discordId: profile.id },
        {
          username: profile.username,
          discriminator: profile.discriminator,
          avatar: profile.avatar,
          discordRoles: memberInfo.roles,
        },
        { upsert: true, new: true },
      )
      .lean();

    return {
      id: user._id.toString(),
      discordId: user.discordId,
      username: user.username,
      discriminator: user.discriminator || null,
      avatar: user.avatar || null,
      discordRoles: user.discordRoles || null,
      hasEditPermission: hasRequiredRole,
      createdAt: (user as any).createdAt || new Date(),
      updatedAt: (user as any).updatedAt || new Date(),
    };
  }

  async verifyBotGuildAccess(guildId: string): Promise<boolean> {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      throw new Error('Discord bot token not configured');
    }

    try {
      console.log(
        `[verifyBotGuildAccess] Verifying bot can access guild ${guildId}`,
      );
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}`,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
        },
      );

      if (response.status === 404) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          `[verifyBotGuildAccess] Guild not found (404): ${JSON.stringify(errorData)}`,
        );
        console.error(
          `[verifyBotGuildAccess] The bot is NOT in the server with ID ${guildId}`,
        );
        console.error(
          `[verifyBotGuildAccess] SOLUTION: Add the bot to the server using OAuth2 URL Generator`,
        );
        return false;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          `[verifyBotGuildAccess] Error accessing guild: ${response.status} - ${JSON.stringify(errorData)}`,
        );
        return false;
      }

      const guildData = await response.json();
      console.log(
        `[verifyBotGuildAccess] Bot can access guild: ${guildData.name} (${guildData.id})`,
      );
      return true;
    } catch (error) {
      console.error(`[verifyBotGuildAccess] Error:`, error);
      return false;
    }
  }

  async getGuildMember(
    guildId: string,
    userId: string,
    maxRetries: number = 3,
  ): Promise<DiscordGuildMember | null> {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      throw new Error('Discord bot token not configured');
    }

    console.log(
      `[getGuildMember] Fetching member info for user ${userId} in guild ${guildId}`,
    );

    // First verify bot can access the guild
    const canAccessGuild = await this.verifyBotGuildAccess(guildId);
    if (!canAccessGuild) {
      throw new Error(
        `Bot cannot access guild ${guildId}. Please add the bot to the server. ` +
          `Go to Discord Developer Portal → OAuth2 → URL Generator → Select 'bot' scope → Copy URL → Open in browser → Select server`,
      );
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const url = `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`;
        console.log(
          `[getGuildMember] Attempt ${attempt + 1}/${maxRetries}: Fetching ${url}`,
        );

        const memberResponse = await fetch(url, {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
        });

        console.log(
          `[getGuildMember] Response status: ${memberResponse.status} ${memberResponse.statusText}`,
        );

        // Handle rate limiting (429)
        if (memberResponse.status === 429) {
          const rateLimitData = await memberResponse.json().catch(() => ({}));
          const retryAfter = rateLimitData.retry_after
            ? parseFloat(rateLimitData.retry_after) * 1000
            : Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s

          if (attempt < maxRetries - 1) {
            console.warn(
              `Discord API rate limited. Retrying after ${retryAfter}ms (attempt ${attempt + 1}/${maxRetries})`,
            );
            await new Promise((resolve) => setTimeout(resolve, retryAfter));
            continue;
          } else {
            throw new Error(
              `Discord API rate limited. Max retries exceeded. Retry after ${retryAfter}ms`,
            );
          }
        }

        if (!memberResponse.ok) {
          const errorText = await memberResponse
            .text()
            .catch(() => 'Unable to read error response');
          let errorData: any = {};
          try {
            errorData = JSON.parse(errorText);
          } catch {
            // Not JSON, ignore
          }
          console.error(`[getGuildMember] API error response: ${errorText}`);

          if (memberResponse.status === 404) {
            // Check if it's "Unknown Guild" error (bot not in server)
            if (
              errorData.code === 10004 ||
              errorText.includes('Unknown Guild')
            ) {
              console.error(
                `[getGuildMember] CRITICAL: Bot is NOT in the server!`,
              );
              console.error(
                `[getGuildMember] Error code: 10004 - Unknown Guild`,
              );
              console.error(`[getGuildMember] SOLUTION:`);
              console.error(
                `  1. Go to https://discord.com/developers/applications`,
              );
              console.error(`  2. Select your application`);
              console.error(`  3. Go to "OAuth2" → "URL Generator"`);
              console.error(`  4. Select scope: "bot"`);
              console.error(
                `  5. Select bot permissions: "View Server Members"`,
              );
              console.error(
                `  6. Copy the generated URL and open it in your browser`,
              );
              console.error(`  7. Select your server and authorize the bot`);
              throw new Error(
                `Bot is not in the server. Please add the bot using OAuth2 URL Generator in Discord Developer Portal.`,
              );
            }

            console.warn(
              `[getGuildMember] User ${userId} not found in guild ${guildId} (404)`,
            );
            console.warn(`[getGuildMember] Possible causes:`);
            console.warn(`  - User is not in the server`);
            console.warn(`  - Bot doesn't have permission to view members`);
            console.warn(`  - Server Members Intent is not enabled`);
            return null;
          }

          if (memberResponse.status === 403) {
            const errorData = await memberResponse.json().catch(() => ({}));
            console.error(
              `[getGuildMember] Forbidden (403): ${JSON.stringify(errorData)}`,
            );
            console.error(`[getGuildMember] Possible causes:`);
            console.error(`  - Bot doesn't have permission to view members`);
            console.error(`  - Server Members Intent is not enabled`);
            console.error(`  - Bot is not in the server`);
            throw new Error(
              `Discord API error: 403 Forbidden - Bot may lack permissions or Server Members Intent`,
            );
          }

          throw new Error(
            `Discord API error: ${memberResponse.status} - ${errorText}`,
          );
        }

        const memberData = await memberResponse.json();
        console.log(
          `[getGuildMember] Success! Member roles:`,
          memberData.roles,
        );
        return memberData;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(
          `[getGuildMember] Error on attempt ${attempt + 1}:`,
          lastError.message,
        );

        // If it's not a rate limit error and not the last attempt, retry with exponential backoff
        if (
          attempt < maxRetries - 1 &&
          !lastError.message.includes('rate limited')
        ) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.warn(
            `Error fetching guild member (attempt ${attempt + 1}/${maxRetries}). Retrying after ${delay}ms:`,
            lastError.message,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // If we get here, all retries failed
    console.error('Error fetching guild member after all retries:', lastError);
    throw lastError || new Error('Failed to fetch guild member');
  }

  async login(user: UserResponseDto, ipAddress?: string, userAgent?: string) {
    const payload = {
      sub: user.id,
      discordId: user.discordId,
      username: user.username,
      hasEditPermission: user.hasEditPermission || false,
    };

    // Log audit trail
    await this.auditLogService
      .log(AuditLogAction.LOGIN, user.id, user.username, {
        discordId: user.discordId,
        ipAddress,
        userAgent,
      })
      .catch((err) => console.error('Failed to log audit trail:', err));

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async validateUser(userId: string): Promise<UserResponseDto | null> {
    const user = await this.userModel.findById(userId).lean().exec();

    if (!user) {
      return null;
    }

    const ADMIN_ROLE_ID = '1161734352447746110';
    const devDiscordId = 'dev-user-0000';

    // Check if user has any of the required roles for edit permission
    // Support multiple role IDs (comma-separated or space-separated)
    const requiredRoleId = process.env.DISCORD_REQUIRED_ROLE_ID;
    const allowedRoleIds = requiredRoleId
      ? requiredRoleId
          .split(/[,\s]+/)
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      : [];

    // For dev users with admin role, always grant edit permission
    const isDevUser = user.discordId === devDiscordId;
    const hasAdminRole = user.discordRoles?.includes(ADMIN_ROLE_ID) || false;
    const hasEditPermission =
      isDevUser && hasAdminRole
        ? true
        : allowedRoleIds.some((roleId) =>
            user.discordRoles?.includes(roleId),
          ) || false;

    return {
      id: user._id.toString(),
      discordId: user.discordId,
      username: user.username,
      discriminator: user.discriminator || null,
      avatar: user.avatar || null,
      discordRoles: user.discordRoles || null,
      hasEditPermission,
      createdAt: (user as any).createdAt || new Date(),
      updatedAt: (user as any).updatedAt || new Date(),
    };
  }

  /**
   * Dev-only login method that creates a mock user for development
   * Only works when NODE_ENV !== 'production'
   * @param ipAddress - Optional IP address for audit logging
   * @param userAgent - Optional user agent for audit logging
   * @param userType - 'admin' for admin access, 'regular' for regular user (default: 'regular')
   */
  async devLogin(
    ipAddress?: string,
    userAgent?: string,
    userType: 'admin' | 'regular' = 'regular',
  ): Promise<{ access_token: string; user: UserResponseDto }> {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Dev login is only available in development mode');
    }

    const ADMIN_ROLE_ID = '1161734352447746110';
    const devDiscordId = 'dev-user-0000';
    const devUsername = 'Dev User';

    // Determine roles and permissions based on user type
    const isAdmin = userType === 'admin';
    const discordRoles = isAdmin ? [ADMIN_ROLE_ID] : [];
    const hasEditPermission = isAdmin;

    // Find or create dev user
    let user = await this.userModel
      .findOne({ discordId: devDiscordId })
      .lean()
      .exec();

    if (!user) {
      // Create dev user
      const newUser = await this.userModel.create({
        discordId: devDiscordId,
        username: devUsername,
        discriminator: '0000',
        avatar: null,
        discordRoles: discordRoles,
      });
      user = newUser.toObject();
    } else {
      // Update existing dev user with current role selection
      await this.userModel.updateOne(
        { discordId: devDiscordId },
        { discordRoles: discordRoles },
      );
      user.discordRoles = discordRoles;
    }

    const userDto: UserResponseDto = {
      id: user._id.toString(),
      discordId: user.discordId,
      username: user.username,
      discriminator: user.discriminator || null,
      avatar: user.avatar || null,
      discordRoles: discordRoles,
      hasEditPermission: hasEditPermission,
      createdAt: (user as any).createdAt || new Date(),
      updatedAt: (user as any).updatedAt || new Date(),
    };

    // Generate token and log audit
    const result = await this.login(userDto, ipAddress, userAgent);

    console.log('[devLogin] Dev user logged in:', {
      id: userDto.id,
      username: userDto.username,
      userType,
      discordRoles: userDto.discordRoles,
      hasEditPermission: hasEditPermission,
    });

    return result;
  }
}
