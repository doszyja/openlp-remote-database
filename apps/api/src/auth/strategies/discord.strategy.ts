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
      scope: ['identify', 'guilds', 'guilds.members.read'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<any> {
    const discordProfile = {
      id: profile.id,
      username: profile.username,
      discriminator: profile.discriminator,
      avatar: profile.avatar,
    };

    const user = await this.authService.validateDiscordUser(
      discordProfile,
      accessToken,
    );

    if (!user) {
      throw new Error('User not authorized - missing role or not in server');
    }

    return { ...user, accessToken };
  }
}

