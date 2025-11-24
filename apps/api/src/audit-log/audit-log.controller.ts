import { Controller, Get, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserResponseDto } from '../auth/dto/user-response.dto';
import { AuditLogAction } from '../schemas/audit-log.schema';

const ADMIN_ROLE_ID = '1161734352447746110';

@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async findAll(
    @CurrentUser() user: UserResponseDto,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('username') username?: string,
    @Query('songId') songId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    // Check if user has admin role
    if (!user.discordRoles || !user.discordRoles.includes(ADMIN_ROLE_ID)) {
      throw new ForbiddenException('Only administrators can view audit logs');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    const filters: {
      action?: AuditLogAction;
      username?: string;
      songId?: string;
      fromDate?: Date;
      toDate?: Date;
    } = {};

    if (action && Object.values(AuditLogAction).includes(action as AuditLogAction)) {
      filters.action = action as AuditLogAction;
    }

    if (username) {
      filters.username = username;
    }

    if (songId) {
      filters.songId = songId;
    }

    if (fromDate) {
      filters.fromDate = new Date(fromDate);
    }

    if (toDate) {
      filters.toDate = new Date(toDate);
    }

    return this.auditLogService.findAll(pageNum, limitNum, Object.keys(filters).length > 0 ? filters : undefined);
  }
}

