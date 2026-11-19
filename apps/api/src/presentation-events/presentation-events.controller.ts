import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { EditPermissionGuard } from '../auth/guards/edit-permission.guard';
import { CreatePresentationEventDto } from './dto/create-presentation-event.dto';
import { QueryPresentationEventsDto } from './dto/query-presentation-events.dto';
import { PresentationEventsService } from './presentation-events.service';

@ApiTags('presentation-events')
@Controller('presentation-events')
export class PresentationEventsController {
  constructor(private readonly eventsService: PresentationEventsService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Record a song presentation from OpenLP' })
  create(@Body() dto: CreatePresentationEventDto) {
    return this.eventsService.create(dto);
  }

  @Get()
  @UseGuards(EditPermissionGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List presentation events' })
  findAll(@Query() query: QueryPresentationEventsDto) {
    return this.eventsService.findAll(query);
  }

  @Get('summary')
  @UseGuards(EditPermissionGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Aggregated presentation statistics' })
  getSummary(
    @Query('clientId') clientId?: string,
    @Query('days') days?: string,
  ) {
    const dayCount = days ? parseInt(days, 10) : 30;
    return this.eventsService.getSummary(clientId, dayCount);
  }
}