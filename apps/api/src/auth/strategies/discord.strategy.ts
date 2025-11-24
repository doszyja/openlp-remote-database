import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-discord';
import { AuthService } from '../auth.service';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      callbackURL: process.env.DISCORD_CALLBACK_URL || 'http://localhost:3000/api/auth/discord/callback',
      scope: ['identify'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<any> {
    try {
      const discordProfile = {
        id: profile.id,
        username: profile.username,
        discriminator: profile.discriminator,
        avatar: profile.avatar,
      };

      console.log('discordProfile', discordProfile);

      const user = await this.authService.validateDiscordUser(
        discordProfile,
        accessToken,
      );

      // Allow login for all guild members (even without required role)
      // hasEditPermission will be false if they don't have the role
      if (!user) {
        throw new Error('User not authorized - not in server');
      }

      return { ...user, accessToken };
    } catch (error) {
      // Re-throw the error so it can be handled by the controller
      // This includes rate limiting errors and authorization errors
      throw error;
    }
  }
}

