import { Controller, Get, Req, Res, UseGuards, Post } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { DiscordAuthGuard } from './guards/discord-auth.guard';
import type { UserResponseDto } from './dto/user-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Get('dev')
  async devLogin(@Req() req: Request, @Res() res: Response) {
    console.log('[devLogin] Dev login endpoint called');
    console.log('[devLogin] NODE_ENV:', process.env.NODE_ENV);

    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      console.log('[devLogin] Blocked: Production mode');
      return res.status(403).json({
        message: 'Dev authentication is only available in development mode',
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    console.log('[devLogin] Frontend URL:', frontendUrl);

    // Get user type from query parameter (admin or regular, default to regular)
    const userType = req.query.type === 'admin' ? 'admin' : 'regular';
    console.log('[devLogin] User type:', userType);

    try {
      const ipAddress = req.ip || req.socket.remoteAddress || undefined;
      const userAgent = req.get('user-agent') || undefined;
      console.log('[devLogin] Calling authService.devLogin');
      const result = await this.authService.devLogin(
        ipAddress,
        userAgent,
        userType,
      );
      console.log(
        '[devLogin] Login successful, redirecting to:',
        `${frontendUrl}/auth/callback?token=${result.access_token.substring(0, 20)}...`,
      );

      // Redirect to frontend with token
      res.redirect(`${frontendUrl}/auth/callback?token=${result.access_token}`);
    } catch (error) {
      console.error('[devLogin] Error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Dev authentication failed';
      res.redirect(
        `${frontendUrl}/auth/callback?error=${encodeURIComponent(errorMessage)}`,
      );
    }
  }

  @Public()
  @Get('discord')
  @UseGuards(DiscordAuthGuard)
  async discordAuth() {
    // Initiates Discord OAuth flow
    // This endpoint redirects to Discord's OAuth page
  }

  @Public()
  @Get('discord/callback')
  @UseGuards(DiscordAuthGuard)
  async discordCallback(@Req() req: Request, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    try {
      // Check if user exists in request (set by Passport strategy)
      if (!req.user) {
        throw new Error('Authentication failed: No user data received');
      }

      const user = req.user as UserResponseDto & { accessToken: string };

      // Validate user data
      if (!user || !user.id) {
        throw new Error('Authentication failed: Invalid user data');
      }

      const ipAddress = req.ip || req.socket.remoteAddress || undefined;
      const userAgent = req.get('user-agent') || undefined;
      const result = await this.authService.login(user, ipAddress, userAgent);

      // Redirect to frontend with token
      res.redirect(`${frontendUrl}/auth/callback?token=${result.access_token}`);
    } catch (error) {
      // Handle different types of errors
      let errorMessage = 'Authentication failed';

      if (error instanceof Error) {
        // Handle specific error types
        if (error.message.includes('Invalid "code"')) {
          errorMessage =
            'Authentication code expired or already used. Please try logging in again.';
        } else if (error.message.includes('rate limited')) {
          errorMessage =
            'Discord API is temporarily unavailable. Please try again in a few moments.';
        } else if (
          error.message.includes('not authorized') ||
          error.message.includes('missing role')
        ) {
          errorMessage = 'missing_role';
        } else if (error.message.includes('Discord API error')) {
          errorMessage = 'Discord API error. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }

      console.error('Discord OAuth callback error:', error);
      res.redirect(
        `${frontendUrl}/auth/callback?error=${encodeURIComponent(errorMessage)}`,
      );
    }
  }

  @Get('me')
  // Security: Stricter rate limiting for auth endpoints to prevent brute force
  // Using 'strict' throttler: 100 requests per 15 minutes
  @Throttle({ strict: { limit: 100, ttl: 900000 } })
  async getProfile(
    @CurrentUser() user: UserResponseDto,
  ): Promise<UserResponseDto> {
    return user;
  }

  @Post('logout')
  // Security: Stricter rate limiting for auth endpoints
  // Using 'strict' throttler: 100 requests per 15 minutes
  @Throttle({ strict: { limit: 100, ttl: 900000 } })
  async logout() {
    // JWT is stateless, so logout is handled client-side
    // In the future, could implement token blacklisting
    return { message: 'Logged out successfully' };
  }
}
