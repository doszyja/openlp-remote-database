import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ServicePlan, ServicePlanDocument } from '../schemas/service-plan.schema';
import { Song, SongDocument } from '../schemas/song.schema';
import { CreateServicePlanDto } from './dto/create-service-plan.dto';
import { UpdateServicePlanDto } from './dto/update-service-plan.dto';
import { AddSongToPlanDto } from './dto/add-song-to-plan.dto';
import { SetActiveSongDto } from './dto/set-active-song.dto';

@Injectable()
export class ServicePlanService {
  constructor(
    @InjectModel(ServicePlan.name) private servicePlanModel: Model<ServicePlanDocument>,
    @InjectModel(Song.name) private songModel: Model<SongDocument>,
  ) {}

  private transformServicePlan(plan: ServicePlanDocument): any {
    const planDoc = plan as any;
    return {
      id: plan._id.toString(),
      name: plan.name,
      date: plan.date,
      items: plan.items.map((item: any) => ({
        id: item._id?.toString() || item.id,
        songId: item.songId,
        songTitle: item.songTitle,
        order: item.order,
        notes: item.notes,
        isActive: item.isActive || false,
      })),
      createdAt: planDoc.createdAt,
      updatedAt: planDoc.updatedAt,
    };
  }

  async create(createServicePlanDto: CreateServicePlanDto) {
    const items = (createServicePlanDto.items || []).map((item, index) => ({
      songId: item.songId,
      songTitle: item.songTitle,
      order: item.order ?? index,
      notes: item.notes,
      isActive: false,
    }));

    const servicePlan = await this.servicePlanModel.create({
      name: createServicePlanDto.name,
      date: createServicePlanDto.date,
      items,
    });

    return this.transformServicePlan(servicePlan);
  }

  async findAll() {
    const plans = await this.servicePlanModel.find().sort({ createdAt: -1 }).exec();
    return plans.map(plan => this.transformServicePlan(plan));
  }

  async findOne(id: string) {
    const servicePlan = await this.servicePlanModel.findById(id).exec();
    if (!servicePlan) {
      throw new NotFoundException(`Service plan with ID ${id} not found`);
    }
    return this.transformServicePlan(servicePlan);
  }

  async findActive() {
    // Find the service plan with an active song
    const plan = await this.servicePlanModel
      .findOne({ 'items.isActive': true })
      .sort({ createdAt: -1 })
      .exec();
    return plan ? this.transformServicePlan(plan) : null;
  }

  async update(id: string, updateServicePlanDto: UpdateServicePlanDto) {
    const servicePlan = await this.servicePlanModel.findById(id).exec();
    if (!servicePlan) {
      throw new NotFoundException(`Service plan with ID ${id} not found`);
    }

    if (updateServicePlanDto.name !== undefined) {
      servicePlan.name = updateServicePlanDto.name;
    }
    if (updateServicePlanDto.date !== undefined) {
      servicePlan.date = updateServicePlanDto.date;
    }
    if (updateServicePlanDto.items !== undefined) {
      servicePlan.items = updateServicePlanDto.items.map((item, index) => ({
        songId: item.songId,
        songTitle: item.songTitle,
        order: item.order ?? index,
        notes: item.notes,
        isActive: item.isActive ?? false,
      }));
    }

    const saved = await servicePlan.save();
    return this.transformServicePlan(saved);
  }

  async addSong(id: string, addSongDto: AddSongToPlanDto) {
    const servicePlan = await this.servicePlanModel.findById(id).exec();
    if (!servicePlan) {
      throw new NotFoundException(`Service plan with ID ${id} not found`);
    }

    // Get song title
    const song = await this.songModel.findById(addSongDto.songId).exec();
    if (!song) {
      throw new NotFoundException(`Song with ID ${addSongDto.songId} not found`);
    }

    const maxOrder = servicePlan.items.length > 0
      ? Math.max(...servicePlan.items.map(item => item.order))
      : -1;

    const newItem = {
      songId: addSongDto.songId,
      songTitle: song.title,
      order: addSongDto.order ?? maxOrder + 1,
      notes: addSongDto.notes,
      isActive: false,
    };

    servicePlan.items.push(newItem);
    const saved = await servicePlan.save();
    return this.transformServicePlan(saved);
  }

  async removeSong(planId: string, itemId: string) {
    const servicePlan = await this.servicePlanModel.findById(planId).exec();
    if (!servicePlan) {
      throw new NotFoundException(`Service plan with ID ${planId} not found`);
    }

    const itemIndex = (servicePlan.items as any[]).findIndex(
      (item: any) => item._id?.toString() === itemId
    );
    
    if (itemIndex === -1) {
      throw new NotFoundException(`Item with ID ${itemId} not found in service plan`);
    }

    servicePlan.items.splice(itemIndex, 1);
    const saved = await servicePlan.save();
    return this.transformServicePlan(saved);
  }

  async setActiveSong(planId: string, setActiveDto: SetActiveSongDto) {
    const servicePlan = await this.servicePlanModel.findById(planId).exec();
    if (!servicePlan) {
      throw new NotFoundException(`Service plan with ID ${planId} not found`);
    }

    // If activating, first deactivate all items in all plans
    if (setActiveDto.isActive) {
      await this.servicePlanModel.updateMany(
        {},
        { $set: { 'items.$[].isActive': false } }
      ).exec();
    }

    // Then deactivate all items in this plan
    servicePlan.items.forEach((item: any) => {
      item.isActive = false;
    });

    // Then activate the specified item if isActive is true
    if (setActiveDto.isActive) {
      const item = (servicePlan.items as any[]).find(
        (i: any) => i._id?.toString() === setActiveDto.itemId
      );
      if (!item) {
        throw new NotFoundException(`Item with ID ${setActiveDto.itemId} not found in service plan`);
      }
      item.isActive = true;
    }

    const saved = await servicePlan.save();
    return this.transformServicePlan(saved);
  }

  async getActiveSong() {
    const servicePlan = await this.servicePlanModel
      .findOne({ 'items.isActive': true })
      .sort({ createdAt: -1 })
      .exec();
    
    if (!servicePlan) {
      return null;
    }

    const activeItem = (servicePlan.items as any[]).find((item: any) => item.isActive);
    if (!activeItem) {
      return null;
    }

    const song = await this.songModel.findById(activeItem.songId).exec();
    if (!song) {
      return null;
    }

    // Transform song to match expected format
    const songDoc = song as any;
    const transformedSong = {
      id: song._id.toString(),
      title: song.title,
      number: song.number,
      language: song.language,
      chorus: song.chorus,
      verses: song.verses || '',
      tags: song.tags.map((tag: any) => ({
        id: tag._id?.toString(),
        name: tag.name,
      })),
      copyright: song.copyright,
      comments: song.comments,
      ccliNumber: song.ccliNumber,
      searchTitle: song.searchTitle,
      searchLyrics: song.searchLyrics,
      openlpMapping: song.openlpMapping,
      createdAt: songDoc.createdAt,
      updatedAt: songDoc.updatedAt,
    };

    return {
      servicePlan: {
        id: servicePlan._id.toString(),
        name: servicePlan.name,
      },
      item: {
        id: activeItem._id?.toString(),
        songId: activeItem.songId,
        songTitle: activeItem.songTitle,
        order: activeItem.order,
      },
      song: transformedSong,
    };
  }

  async delete(id: string) {
    const result = await this.servicePlanModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Service plan with ID ${id} not found`);
    }
    return result;
  }
}

