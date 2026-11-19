import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import type { UserResponseDto } from './dto/user-response.dto';

interface PendingOpenLpAuth {
  code: string;
  userId: string;
  state: string;
  redirectPort: number;
  expiresAt: number;
}

const CODE_TTL_MS = 2 * 60 * 1000;

@Injectable()
export class OpenLpAuthService {
  private readonly pending = new Map<string, PendingOpenLpAuth>();

  constructor(private readonly authService: AuthService) {}

  private purgeExpired() {
    const now = Date.now();
    for (const [code, entry] of this.pending.entries()) {
      if (entry.expiresAt <= now) {
        this.pending.delete(code);
      }
    }
  }

  createAuthorizationCode(
    user: UserResponseDto,
    state: string,
    redirectPort: number,
  ): { code: string; expiresIn: number } {
    if (!state || state.length < 8) {
      throw new BadRequestException('Invalid state');
    }
    if (!Number.isFinite(redirectPort) || redirectPort < 1024 || redirectPort > 65535) {
      throw new BadRequestException('Invalid redirect port');
    }

    this.purgeExpired();

    const code = randomBytes(24).toString('hex');
    this.pending.set(code, {
      code,
      userId: user.id,
      state,
      redirectPort,
      expiresAt: Date.now() + CODE_TTL_MS,
    });

    return { code, expiresIn: CODE_TTL_MS / 1000 };
  }

  async exchangeCode(
    code: string,
    state: string,
  ): Promise<{ access_token: string; expires_in: number }> {
    this.purgeExpired();

    const entry = this.pending.get(code);
    if (!entry) {
      throw new UnauthorizedException('Invalid or expired authorization code');
    }
    if (entry.state !== state) {
      throw new UnauthorizedException('State mismatch');
    }

    this.pending.delete(code);

    const user = await this.authService.validateUser(entry.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const login = await this.authService.login(user);
    return {
      access_token: login.access_token,
      expires_in: 7 * 24 * 60 * 60,
    };
  }
}