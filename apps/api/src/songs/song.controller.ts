import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { SongService } from './song.service';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { QuerySongDto } from './dto/query-song.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { EditPermissionGuard } from '../auth/guards/edit-permission.guard';
import { ZipExportThrottlerGuard } from './guards/zip-export-throttler.guard';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditLogAction } from '../schemas/audit-log.schema';
import type { UserResponseDto } from '../auth/dto/user-response.dto';

@Controller('songs')
export class SongController {
  constructor(
    private readonly songService: SongService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(EditPermissionGuard)
  // Protected: Only authenticated users with edit permission can create songs
  create(@Body() createSongDto: CreateSongDto) {
    return this.songService.create(createSongDto);
  }

  @Get()
  @Public() // Public: Anonymous users can view song list
  findAll(@Query() query: QuerySongDto) {
    return this.songService.findAll(query);
  }

  @Get('search')
  @Public() // Public: Anonymous users can search songs
  // Security: Stricter rate limiting for search endpoints to prevent abuse
  @Throttle({ search: { limit: 600, ttl: 60000 } }) // 600 requests per minute
  search(@Query('q') search: string, @Query() query: QuerySongDto) {
    return this.songService.findAll({ ...query, search });
  }

  @Get('version')
  @Public() // Public: Anonymous users can check version
  async getVersion() {
    const version = await this.songService.getVersion();
    return { version };
  }

  @Get('all')
  @Public() // Public: Anonymous users can get all songs (for caching)
  // Security: Rate limit this endpoint more strictly as it returns all songs
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 requests per minute
  async getAllSongs() {
    const songs = await this.songService.findAllForCache();
    const version = await this.songService.getVersion();
    return {
      version,
      songs,
    };
  }

  @Get(':id')
  @Public() // Public: Anonymous users can view individual songs
  findOne(@Param('id') id: string) {
    return this.songService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(EditPermissionGuard)
  // Protected: Only authenticated users with edit permission can update songs
  update(
    @Param('id') id: string,
    @Body() updateSongDto: UpdateSongDto,
    @CurrentUser() user: UserResponseDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;
    const userAgent = req.get('user-agent') || undefined;
    return this.songService.update(
      id,
      updateSongDto,
      user?.id,
      user?.username,
      user?.discordId,
      ipAddress,
      userAgent,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(EditPermissionGuard)
  // Protected: Only authenticated users with edit permission can delete songs
  remove(
    @Param('id') id: string,
    @CurrentUser() user: UserResponseDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;
    const userAgent = req.get('user-agent') || undefined;
    return this.songService.remove(
      id,
      user?.id,
      user?.username,
      user?.discordId,
      ipAddress,
      userAgent,
    );
  }

  @Get('export/zip')
  // Protected: Only authenticated users with edit permission can export songs
  @UseGuards(EditPermissionGuard, ZipExportThrottlerGuard)
  @Throttle({ 'zip-export': { limit: 10, ttl: 60000 } }) // 10 requests per minute per user
  async exportAllToZip(
    @CurrentUser() user: UserResponseDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const archive = await this.songService.exportAllToZip();

    const timestamp = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="openlp-songs-${timestamp}.zip"`,
    );

    // Log audit trail for ZIP export
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;
    const userAgent = req.get('user-agent') || undefined;

    this.auditLogService
      .log(AuditLogAction.ZIP_EXPORT, user.id, user.username, {
        discordId: user.discordId,
        metadata: {
          exportType: 'zip',
          timestamp,
        },
        ipAddress,
        userAgent,
      })
      .catch((err) =>
        console.error('Failed to log ZIP export audit trail:', err),
      );

    archive.pipe(res);

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error creating archive' });
      }
    });
  }
}
