import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { UserResponseDto } from '../dto/user-response.dto';

const ADMIN_ROLE_ID = '1161734352447746110';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: UserResponseDto | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!user.discordRoles?.includes(ADMIN_ROLE_ID)) {
      throw new ForbiddenException(
        'Only administrators can access this resource.',
      );
    }

    return true;
  }
}