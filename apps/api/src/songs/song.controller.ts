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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { SongService } from './song.service';
import { SongVersionService } from './song-version.service';
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

@ApiTags('songs')
@Controller('songs')
export class SongController {
  constructor(
    private readonly songService: SongService,
    private readonly songVersionService: SongVersionService,
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

  @Get('export/sqlite')
  @Public() // Public: Allow anonymous users to download SQLite database for sync
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 100 requests per minute
  async exportToSqlite(@Res() res: Response) {
    let sqlitePath: string | null = null;
    try {
      sqlitePath = await this.songService.exportToSqlite();

      const timestamp = new Date().toISOString().split('T')[0];
      const cacheMaxAge = 120; // 2 minutes in seconds
      const expiresDate = new Date(Date.now() + cacheMaxAge * 1000);

      // Set content headers
      res.setHeader('Content-Type', 'application/x-sqlite3');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="songs-${timestamp}.sqlite"`,
      );

      // Set cache control headers
      res.setHeader(
        'Cache-Control',
        `public, max-age=${cacheMaxAge}, must-revalidate`,
      );
      res.setHeader('Expires', expiresDate.toUTCString());

      // Set ETag based on file modification time for cache validation
      const stats = fs.statSync(sqlitePath);
      const etag = `"${stats.mtime.getTime()}-${stats.size}"`;
      res.setHeader('ETag', etag);

      // Check If-None-Match header for cache validation
      const ifNoneMatch = (res.req as any).headers['if-none-match'];
      if (ifNoneMatch === etag) {
        return res.status(304).end(); // Not Modified
      }

      // Stream the file
      const fileStream = fs.createReadStream(sqlitePath);
      fileStream.pipe(res);

      // Clean up temporary file after streaming
      // Don't delete if file is cached (will be reused within 1 minutes)
      fileStream.on('end', () => {
        if (sqlitePath && !this.songService.isCached(sqlitePath)) {
          fs.unlink(sqlitePath, (err: any) => {
            if (err) {
              console.error('Failed to delete temporary SQLite file:', err);
            }
          });
        }
      });

      fileStream.on('error', (err: any) => {
        console.error('Error streaming SQLite file:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error exporting SQLite database' });
        }
        // Clean up on error
        if (sqlitePath) {
          fs.unlink(sqlitePath, () => {});
        }
      });
    } catch (error) {
      console.error('Error exporting to SQLite:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error exporting SQLite database' });
      }
      // Clean up on error
      if (sqlitePath) {
        fs.unlink(sqlitePath, () => {});
      }
    }
  }

  // Version history endpoints
  @Get(':id/versions')
  @Public() // Public: Anyone can view version history
  @ApiOperation({ summary: 'Get version history for a song' })
  @ApiParam({ name: 'id', description: 'Song ID' })
  @ApiResponse({ status: 200, description: 'List of song versions' })
  async getVersions(@Param('id') id: string) {
    return this.songVersionService.getVersions(id);
  }

  // IMPORTANT: This endpoint must be BEFORE ':id/versions/:version' to avoid routing conflicts
  @Get(':id/versions/compare')
  @Public() // Public: Anyone can compare versions
  @ApiOperation({ summary: 'Compare two versions of a song' })
  @ApiParam({ name: 'id', description: 'Song ID' })
  @ApiQuery({ name: 'v1', description: 'First version number' })
  @ApiQuery({ name: 'v2', description: 'Second version number' })
  @ApiResponse({ status: 200, description: 'Comparison result' })
  async compareVersions(
    @Param('id') id: string,
    @Query('v1') v1: string,
    @Query('v2') v2: string,
  ) {
    if (!v1 || !v2 || v1.trim() === '' || v2.trim() === '') {
      throw new BadRequestException(
        'Both v1 and v2 query parameters are required',
      );
    }
    const version1 = parseInt(v1, 10);
    const version2 = parseInt(v2, 10);
    if (isNaN(version1) || version1 < 1 || isNaN(version2) || version2 < 1) {
      throw new BadRequestException(
        `Invalid version numbers: v1=${v1}, v2=${v2}. Both must be positive integers.`,
      );
    }
    return this.songVersionService.compareVersions(id, version1, version2);
  }

  @Get(':id/versions/:version')
  @Public() // Public: Anyone can view a specific version
  @ApiOperation({ summary: 'Get a specific version of a song' })
  @ApiParam({ name: 'id', description: 'Song ID' })
  @ApiParam({ name: 'version', description: 'Version number' })
  @ApiResponse({ status: 200, description: 'Song version data' })
  async getSongVersion(
    @Param('id') id: string,
    @Param('version') version: string,
  ) {
    if (!version || version.trim() === '') {
      throw new BadRequestException('Version parameter is required');
    }
    const versionNum = parseInt(version, 10);
    if (isNaN(versionNum) || versionNum < 1) {
      throw new BadRequestException(
        `Invalid version number: ${version}. Version must be a positive integer.`,
      );
    }
    return this.songVersionService.getVersion(id, versionNum);
  }

  @Post(':id/versions/:version/restore')
  @UseGuards(EditPermissionGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Restore a song to a specific version' })
  @ApiParam({ name: 'id', description: 'Song ID' })
  @ApiParam({ name: 'version', description: 'Version number to restore' })
  @ApiResponse({ status: 200, description: 'Song restored successfully' })
  // Protected: Only authenticated users with edit permission can restore versions
  async restoreVersion(
    @Param('id') id: string,
    @Param('version') version: string,
    @CurrentUser() user: UserResponseDto,
    @Req() req: Request,
  ) {
    if (!version || version.trim() === '') {
      throw new BadRequestException('Version parameter is required');
    }
    const versionNum = parseInt(version, 10);
    if (isNaN(versionNum) || versionNum < 1) {
      throw new BadRequestException(
        `Invalid version number: ${version}. Version must be a positive integer.`,
      );
    }

    const ipAddress = req.ip || req.socket.remoteAddress || undefined;
    const userAgent = req.get('user-agent') || undefined;

    const restoredSong = await this.songVersionService.restoreVersion(
      id,
      versionNum,
      user?.id,
      user?.username,
      user?.discordId,
    );

    // Log audit trail
    if (user?.id && user?.username) {
      await this.auditLogService
        .log(AuditLogAction.SONG_EDIT, user.id, user.username, {
          discordId: user.discordId,
          songId: id,
          songTitle: restoredSong.title,
          metadata: {
            action: 'restore_version',
            restoredFromVersion: versionNum,
          },
          ipAddress,
          userAgent,
        })
        .catch((err) => console.error('Failed to log audit trail:', err));
    }

    return restoredSong;
  }
}
