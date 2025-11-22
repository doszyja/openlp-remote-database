import { Controller, Get, Req, Res, UseGuards, Post } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { UserResponseDto } from './dto/user-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Temporarily disabled - Discord OAuth requires configuration
  // @Public()
  // @Get('discord')
  // @UseGuards(AuthGuard('discord'))
  // async discordAuth() {
  //   // Initiates Discord OAuth flow
  // }

  // @Public()
  // @Get('discord/callback')
  // @UseGuards(AuthGuard('discord'))
  // async discordCallback(@Req() req: Request, @Res() res: Response) {
  //   const user = req.user as UserResponseDto & { accessToken: string };
  //   const result = await this.authService.login(user);

  //   // Redirect to frontend with token
  //   const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  //   res.redirect(`${frontendUrl}/auth/callback?token=${result.access_token}`);
  // }

  @Get('me')
  async getProfile(@CurrentUser() user: UserResponseDto): Promise<UserResponseDto> {
    return user;
  }

  @Post('logout')
  async logout() {
    // JWT is stateless, so logout is handled client-side
    // In the future, could implement token blacklisting
    return { message: 'Logged out successfully' };
  }
}

