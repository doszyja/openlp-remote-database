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
import { ServicePlanService } from './service-plan.service';
import { CreateServicePlanDto } from './dto/create-service-plan.dto';
import { UpdateServicePlanDto } from './dto/update-service-plan.dto';
import { AddSongToPlanDto } from './dto/add-song-to-plan.dto';
import { SetActiveSongDto } from './dto/set-active-song.dto';
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
  findAll() {
    return this.servicePlanService.findAll();
  }

  @Get('active')
  @Public()
  getActiveSong() {
    return this.servicePlanService.getActiveSong();
  }

  @Get(':id')
  @Public()
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(EditPermissionGuard)
  remove(@Param('id') id: string) {
    return this.servicePlanService.delete(id);
  }
}

