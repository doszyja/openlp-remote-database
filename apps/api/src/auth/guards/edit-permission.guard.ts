import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserResponseDto } from '../dto/user-response.dto';

@Injectable()
export class EditPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: UserResponseDto | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!user.hasEditPermission) {
      throw new ForbiddenException('You do not have permission to perform this action. Contact an administrator to get the required Discord role.');
    }

    return true;
  }
}

