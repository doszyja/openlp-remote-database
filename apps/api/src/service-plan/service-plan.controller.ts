import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ServicePlanService } from './service-plan.service';
import { CreateServicePlanDto } from './dto/create-service-plan.dto';
import { UpdateServicePlanDto } from './dto/update-service-plan.dto';
import { AddSongToPlanDto } from './dto/add-song-to-plan.dto';
import { SetActiveSongDto } from './dto/set-active-song.dto';
import { SetActiveVerseDto } from './dto/set-active-verse.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { EditPermissionGuard } from '../auth/guards/edit-permission.guard';
import type { UserResponseDto } from '../auth/dto/user-response.dto';

@Controller('service-plans')
export class ServicePlanController {
  constructor(private readonly servicePlanService: ServicePlanService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(EditPermissionGuard)
  create(@Body() createServicePlanDto: CreateServicePlanDto) {
    return this.servicePlanService.create(createServicePlanDto);
  }

  @Get()
  @Public()
  @SkipThrottle() // Allow frequent access to service plans list (used by multiple components)
  findAll() {
    return this.servicePlanService.findAll();
  }

  @Get('active')
  @Public()
  @SkipThrottle() // Allow high-frequency polling for active song endpoint (used by live view)
  getActiveSong() {
    return this.servicePlanService.getActiveSong();
  }

  @Get(':id')
  @Public()
  @SkipThrottle() // Allow frequent access to service plan details (used by live view and detail pages)
  findOne(@Param('id') id: string) {
    return this.servicePlanService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(EditPermissionGuard)
  update(@Param('id') id: string, @Body() updateServicePlanDto: UpdateServicePlanDto) {
    return this.servicePlanService.update(id, updateServicePlanDto);
  }

  @Post(':id/songs')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(EditPermissionGuard)
  addSong(@Param('id') id: string, @Body() addSongDto: AddSongToPlanDto) {
    return this.servicePlanService.addSong(id, addSongDto);
  }

  @Delete(':planId/songs/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(EditPermissionGuard)
  removeSong(@Param('planId') planId: string, @Param('itemId') itemId: string) {
    return this.servicePlanService.removeSong(planId, itemId);
  }

  @Patch(':id/active')
  @UseGuards(EditPermissionGuard)
  setActiveSong(@Param('id') id: string, @Body() setActiveDto: SetActiveSongDto) {
    return this.servicePlanService.setActiveSong(id, setActiveDto);
  }

  @Patch(':id/active-verse')
  @UseGuards(EditPermissionGuard)
  setActiveVerse(@Param('id') id: string, @Body() setActiveVerseDto: SetActiveVerseDto) {
    return this.servicePlanService.setActiveVerse(id, setActiveVerseDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(EditPermissionGuard)
  remove(@Param('id') id: string) {
    return this.servicePlanService.delete(id);
  }
}

