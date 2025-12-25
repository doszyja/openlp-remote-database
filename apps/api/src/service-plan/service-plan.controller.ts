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
  Res,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
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
  update(
    @Param('id') id: string,
    @Body() updateServicePlanDto: UpdateServicePlanDto,
  ) {
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
  setActiveSong(
    @Param('id') id: string,
    @Body() setActiveDto: SetActiveSongDto,
  ) {
    return this.servicePlanService.setActiveSong(id, setActiveDto);
  }

  @Patch(':id/active-verse')
  @UseGuards(EditPermissionGuard)
  setActiveVerse(
    @Param('id') id: string,
    @Body() setActiveVerseDto: SetActiveVerseDto,
  ) {
    return this.servicePlanService.setActiveVerse(id, setActiveVerseDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(EditPermissionGuard)
  remove(@Param('id') id: string) {
    return this.servicePlanService.delete(id);
  }

  @Get(':id/export/openlp')
  @Public() // Allow export for viewing
  async exportToOpenLP(@Param('id') id: string, @Res() res: Response) {
    const xml = await this.servicePlanService.exportToOpenLP(id);
    const plan = await this.servicePlanService.findOne(id);

    const filename = `${plan.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xml`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xml);
  }

  @Get(':id/export/osz')
  @Public() // Allow export for viewing
  async exportToOsz(@Param('id') id: string, @Res() res: Response) {
    const plan = await this.servicePlanService.findOne(id);
    const archive = await this.servicePlanService.exportToOsz(id);

    const filename = `${plan.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.osz`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    archive.pipe(res);
    archive.on('error', (err) => {
      res
        .status(500)
        .json({ message: 'Error creating archive', error: err.message });
    });
  }

  @Post(':id/share')
  @UseGuards(EditPermissionGuard)
  async generateShareToken(
    @Param('id') id: string,
    @Body() body: { expiresInDays?: number },
  ) {
    const token = await this.servicePlanService.generateShareToken(
      id,
      body.expiresInDays,
    );
    return { shareToken: token };
  }

  @Delete(':id/share')
  @UseGuards(EditPermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeShareToken(@Param('id') id: string) {
    await this.servicePlanService.revokeShareToken(id);
  }

  @Get('shared/:token')
  @Public() // Allow access via share token
  async getByShareToken(@Param('token') token: string) {
    return this.servicePlanService.findByShareToken(token);
  }

  @Post(':id/control')
  @UseGuards(EditPermissionGuard)
  async generateControlToken(
    @Param('id') id: string,
    @Body() body: { expiresInDays?: number },
  ) {
    const token = await this.servicePlanService.generateControlToken(
      id,
      body.expiresInDays,
    );
    return { controlToken: token };
  }

  @Delete(':id/control')
  @UseGuards(EditPermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeControlToken(@Param('id') id: string) {
    await this.servicePlanService.revokeControlToken(id);
  }

  @Patch('control/:token/active')
  @Public() // Allow control via token (no auth required)
  async controlActiveSong(
    @Param('token') token: string,
    @Body() setActiveDto: SetActiveSongDto,
  ) {
    return this.servicePlanService.controlActiveSong(token, setActiveDto);
  }

  @Patch('control/:token/active-verse')
  @Public() // Allow control via token (no auth required)
  async controlActiveVerse(
    @Param('token') token: string,
    @Body() setActiveVerseDto: SetActiveVerseDto,
  ) {
    return this.servicePlanService.controlActiveVerse(token, setActiveVerseDto);
  }

  @Get('control/:token/active')
  @Public() // Allow viewing active song via control token
  async getActiveSongByControlToken(@Param('token') token: string) {
    const planId = await this.servicePlanService.verifyControlToken(token);
    return this.servicePlanService.getActiveSong();
  }
}
