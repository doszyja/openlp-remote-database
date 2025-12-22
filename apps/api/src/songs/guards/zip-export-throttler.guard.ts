import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import type { UserResponseDto } from '../../auth/dto/user-response.dto';

/**
 * Custom throttler guard for ZIP export endpoint
 * Uses user ID for authenticated users, IP for anonymous users
 * Limits: 10 requests per minute per user
 */
@Injectable()
export class ZipExportThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const request = req as Request & { user?: UserResponseDto };

    // Use user ID if authenticated, otherwise use IP
    if (request.user?.id) {
      return `zip-export:user:${request.user.id}`;
    }

    // Fallback to IP for anonymous users
    return `zip-export:ip:${request.ip || request.socket?.remoteAddress || 'unknown'}`;
  }
}
