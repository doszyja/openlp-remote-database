import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

@Injectable()
export class DiscordAuthGuard extends AuthGuard('discord') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const response = context.switchToHttp().getResponse<Response>();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // If there's an error or no user, redirect to frontend with error
    if (err || !user) {
      let errorMessage = 'Authentication failed';

      if (err) {
        if (err.message) {
          if (err.message.includes('not authorized') || err.message.includes('missing role')) {
            errorMessage = 'missing_role';
          } else if (err.message.includes('Invalid "code"')) {
            errorMessage = 'Authentication code expired or already used. Please try logging in again.';
          } else if (err.message.includes('rate limited')) {
            errorMessage = 'Discord API is temporarily unavailable. Please try again in a few moments.';
          } else if (err.message.includes('Discord API error')) {
            errorMessage = 'Discord API error. Please try again later.';
          } else {
            errorMessage = err.message;
          }
        }
      } else if (info) {
        // Passport info object might contain error details
        if (info.message) {
          errorMessage = info.message;
        }
      }

      console.error('Discord OAuth callback error:', err || info);
      response.redirect(`${frontendUrl}/auth/callback?error=${encodeURIComponent(errorMessage)}`);
      return null;
    }

    return user;
  }
}

