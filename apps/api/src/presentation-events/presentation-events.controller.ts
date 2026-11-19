import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { EditPermissionGuard } from '../auth/guards/edit-permission.guard';
import { AuthService } from '../auth/auth.service';
import { CreatePresentationEventDto } from './dto/create-presentation-event.dto';
import { CreateBrowserSongViewDto } from './dto/create-browser-song-view.dto';
import {
  QueryPresentationEventsDto,
  QueryPresentationSummaryDto,
} from './dto/query-presentation-events.dto';
import { PresentationEventsService } from './presentation-events.service';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('presentation-events')
@Controller('presentation-events')
export class PresentationEventsController {
  constructor(
    private readonly eventsService: PresentationEventsService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Record a song presentation from OpenLP' })
  create(@Body() dto: CreatePresentationEventDto) {
    return this.eventsService.create(dto);
  }

  @Post('browser')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 180, ttl: 60000 } })
  @ApiOperation({
    summary: 'Record a song view from the web app (detail/presentation/live)',
  })
  async createBrowser(
    @Body() dto: CreateBrowserSongViewDto,
    @Req() req: Request,
  ) {
    const viewer = await this.resolveOptionalViewer(req);
    return this.eventsService.createBrowserView(dto, {
      userAgent: req.get('user-agent') || undefined,
      viewer,
    });
  }

  @Get()
  @UseGuards(EditPermissionGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List song view events (OpenLP + browser)' })
  findAll(@Query() query: QueryPresentationEventsDto) {
    return this.eventsService.findAll(query);
  }

  @Get('summary')
  @UseGuards(EditPermissionGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Aggregated song view statistics' })
  getSummary(@Query() query: QueryPresentationSummaryDto) {
    return this.eventsService.getSummary(query);
  }

  @Post('backfill-viewer-identity')
  @UseGuards(EditPermissionGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Attach Mongo user fields to presentation events from clientId (Discord or user id)',
  })
  backfillViewerIdentity() {
    return this.eventsService.backfillViewerIdentityFromClientId();
  }

  private async resolveOptionalViewer(req: Request) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return null;
    }
    try {
      const payload = this.jwtService.verify<JwtPayload>(header.slice(7));
      const user = await this.authService.validateUser(payload.sub);
      if (!user) return null;
      return {
        viewerUserId: user.id,
        viewerUsername: user.username,
        viewerDiscordId: user.discordId,
      };
    } catch {
      return null;
    }
  }
}
