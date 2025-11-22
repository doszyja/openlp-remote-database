import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import type { UserResponseDto } from './dto/user-response.dto';

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
  ) {}

  async validateDiscordUser(profile: DiscordProfile, accessToken: string): Promise<UserResponseDto | null> {
    // Check if user is in the required Discord server
    const guildId = process.env.DISCORD_GUILD_ID;
    const requiredRoleId = process.env.DISCORD_REQUIRED_ROLE_ID;

    if (!guildId || !requiredRoleId) {
      throw new Error('Discord configuration missing');
    }

    // Fetch user's guild member info
    const memberInfo = await this.getGuildMember(guildId, profile.id, accessToken);

    if (!memberInfo) {
      // User is not in the server
      return null;
    }

    // Check if user has the required role
    const hasRequiredRole = memberInfo.roles.includes(requiredRoleId);
    if (!hasRequiredRole) {
      // User doesn't have the required role
      return null;
    }

    // Create or update user in database
    const user = await this.userModel.findOneAndUpdate(
      { discordId: profile.id },
      {
        username: profile.username,
        discriminator: profile.discriminator,
        avatar: profile.avatar,
        discordRoles: memberInfo.roles,
      },
      { upsert: true, new: true },
    ).lean();

    return {
      id: user._id.toString(),
      discordId: user.discordId,
      username: user.username,
      discriminator: user.discriminator || null,
      avatar: user.avatar || null,
      discordRoles: user.discordRoles || null,
      createdAt: (user as any).createdAt || new Date(),
      updatedAt: (user as any).updatedAt || new Date(),
    };
  }

  async getGuildMember(
    guildId: string,
    userId: string,
    accessToken: string,
  ): Promise<DiscordGuildMember | null> {
    try {
      const response = await fetch(
        `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          // User is not in the guild
          return null;
        }
        throw new Error(`Discord API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching guild member:', error);
      return null;
    }
  }

  async login(user: UserResponseDto) {
    const payload = {
      sub: user.id,
      discordId: user.discordId,
      username: user.username,
    };

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

    return {
      id: user._id.toString(),
      discordId: user.discordId,
      username: user.username,
      discriminator: user.discriminator || null,
      avatar: user.avatar || null,
      discordRoles: user.discordRoles || null,
      createdAt: (user as any).createdAt || new Date(),
      updatedAt: (user as any).updatedAt || new Date(),
    };
  }
}
