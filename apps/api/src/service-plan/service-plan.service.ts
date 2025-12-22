import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ServicePlan,
  ServicePlanDocument,
} from '../schemas/service-plan.schema';
import { Song, SongDocument } from '../schemas/song.schema';
import { CreateServicePlanDto } from './dto/create-service-plan.dto';
import { UpdateServicePlanDto } from './dto/update-service-plan.dto';
import { AddSongToPlanDto } from './dto/add-song-to-plan.dto';
import { SetActiveSongDto } from './dto/set-active-song.dto';
import { SetActiveVerseDto } from './dto/set-active-verse.dto';
import { ServicePlanGateway } from './service-plan.gateway';
import { WebSocketServerService } from './websocket-server.service';

@Injectable()
export class ServicePlanService {
  private readonly logger = new Logger(ServicePlanService.name);

  constructor(
    @InjectModel(ServicePlan.name)
    private servicePlanModel: Model<ServicePlanDocument>,
    @InjectModel(Song.name) private songModel: Model<SongDocument>,
    @Inject(forwardRef(() => ServicePlanGateway))
    private readonly servicePlanGateway: ServicePlanGateway,
    @Inject(forwardRef(() => WebSocketServerService))
    private readonly websocketServer: WebSocketServerService,
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
        activeVerseIndex:
          typeof item.activeVerseIndex === 'number' ? item.activeVerseIndex : 0,
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
      activeVerseIndex: 0,
    }));

    const servicePlan = await this.servicePlanModel.create({
      name: createServicePlanDto.name,
      date: createServicePlanDto.date,
      items,
    });

    const transformed = this.transformServicePlan(servicePlan);
    // Broadcast in case someone is already listening for active changes (no active song yet,
    // but plan list may change)
    await this.websocketServer.broadcastActiveSong();
    return transformed;
  }

  async findAll() {
    const plans = await this.servicePlanModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
    return plans.map((plan) => this.transformServicePlan(plan));
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
        activeVerseIndex: item.activeVerseIndex ?? 0,
      }));
    }

    const saved = await servicePlan.save();
    const transformed = this.transformServicePlan(saved);
    await this.websocketServer.broadcastActiveSong();
    return transformed;
  }

  async addSong(id: string, addSongDto: AddSongToPlanDto) {
    const servicePlan = await this.servicePlanModel.findById(id).exec();
    if (!servicePlan) {
      throw new NotFoundException(`Service plan with ID ${id} not found`);
    }

    // Get song title
    const song = await this.songModel.findById(addSongDto.songId).exec();
    if (!song) {
      throw new NotFoundException(
        `Song with ID ${addSongDto.songId} not found`,
      );
    }

    const maxOrder =
      servicePlan.items.length > 0
        ? Math.max(...servicePlan.items.map((item) => item.order))
        : -1;

    const newItem = {
      songId: addSongDto.songId,
      songTitle: song.title,
      order: addSongDto.order ?? maxOrder + 1,
      notes: addSongDto.notes,
      isActive: false,
      activeVerseIndex: 0,
    };

    servicePlan.items.push(newItem);
    const saved = await servicePlan.save();
    const transformed = this.transformServicePlan(saved);
    await this.websocketServer.broadcastActiveSong();
    return transformed;
  }

  async removeSong(planId: string, itemId: string) {
    const servicePlan = await this.servicePlanModel.findById(planId).exec();
    if (!servicePlan) {
      throw new NotFoundException(`Service plan with ID ${planId} not found`);
    }

    const itemIndex = (servicePlan.items as any[]).findIndex(
      (item: any) => item._id?.toString() === itemId,
    );

    if (itemIndex === -1) {
      throw new NotFoundException(
        `Item with ID ${itemId} not found in service plan`,
      );
    }

    servicePlan.items.splice(itemIndex, 1);
    const saved = await servicePlan.save();
    const transformed = this.transformServicePlan(saved);
    await this.websocketServer.broadcastActiveSong();
    return transformed;
  }

  async setActiveSong(planId: string, setActiveDto: SetActiveSongDto) {
    const servicePlan = await this.servicePlanModel.findById(planId).exec();
    if (!servicePlan) {
      throw new NotFoundException(`Service plan with ID ${planId} not found`);
    }

    // If activating, first deactivate all items in all plans
    if (setActiveDto.isActive) {
      await this.servicePlanModel
        .updateMany({}, { $set: { 'items.$[].isActive': false } })
        .exec();
    }

    // Then deactivate all items in this plan
    servicePlan.items.forEach((item: any) => {
      item.isActive = false;
    });

    // Then activate the specified item if isActive is true
    if (setActiveDto.isActive) {
      const item = (servicePlan.items as any[]).find(
        (i: any) => i._id?.toString() === setActiveDto.itemId,
      );
      if (!item) {
        throw new NotFoundException(
          `Item with ID ${setActiveDto.itemId} not found in service plan`,
        );
      }
      item.isActive = true;
      // Reset verse index to first verse when activating a new song
      item.activeVerseIndex = 0;
    }

    const saved = await servicePlan.save();
    const transformed = this.transformServicePlan(saved);
    await this.websocketServer.broadcastActiveSong();
    return transformed;
  }

  async setActiveVerse(planId: string, setActiveVerseDto: SetActiveVerseDto) {
    const servicePlan = await this.servicePlanModel.findById(planId).exec();
    if (!servicePlan) {
      throw new NotFoundException(`Service plan with ID ${planId} not found`);
    }

    const item = (servicePlan.items as any[]).find(
      (i: any) => i._id?.toString() === setActiveVerseDto.itemId,
    );

    if (!item) {
      throw new NotFoundException(
        `Item with ID ${setActiveVerseDto.itemId} not found in service plan`,
      );
    }

    item.activeVerseIndex = setActiveVerseDto.verseIndex;

    const saved = await servicePlan.save();
    const transformed = this.transformServicePlan(saved);
    await this.websocketServer.broadcastActiveSong();
    return transformed;
  }

  async getActiveSong() {
    const servicePlan = await this.servicePlanModel
      .findOne({ 'items.isActive': true })
      .sort({ createdAt: -1 })
      .exec();

    if (!servicePlan) {
      return null;
    }

    const activeItem = (servicePlan.items as any[]).find(
      (item: any) => item.isActive,
    );
    if (!activeItem) {
      return null;
    }

    const song = await this.songModel.findById(activeItem.songId).exec();
    if (!song) {
      return null;
    }

    // Transform song to match expected format
    const songDoc = song as any;

    // Convert verses to string - handle both new format (array) and legacy format (string)
    let versesString: string = '';
    if (Array.isArray(song.verses) && song.verses.length > 0) {
      // New format: array of objects with order - sort by order and join content
      const sortedVerses = [...song.verses].sort(
        (a: any, b: any) => (a.order || 0) - (b.order || 0),
      );
      versesString = sortedVerses.map((v: any) => v.content).join('\n\n');
    } else if (typeof song.verses === 'string') {
      // Legacy format: string
      versesString = song.verses;
    }

    // Debug: log verses info for troubleshooting
    if (versesString) {
      this.logger.debug(
        `Song ${song._id.toString()} (${song.title}) has verses: length=${versesString.length}, preview=${versesString.substring(0, 100)}`,
      );
    } else {
      // Log as debug instead of warn - this is handled gracefully (empty string is returned)
      this.logger.debug(
        `Song ${song._id.toString()} (${song.title}) has no verses (type: ${Array.isArray(song.verses) ? 'array' : typeof song.verses})`,
      );
    }

    const transformedSong = {
      id: song._id.toString(),
      title: song.title,
      number: song.number ?? null,
      language: song.language ?? 'en',
      // Ensure verses string is always provided for live view (never null/undefined)
      verses: versesString,
      // Tags in Song schema są przechowywane jako string[] (nazwy tagów),
      // ale frontend oczekuje obiektów { id, name }. Zmapujmy bezpiecznie.
      tags: Array.isArray(song.tags)
        ? song.tags.map((tag: any) =>
            typeof tag === 'string'
              ? { id: tag, name: tag }
              : { id: tag._id?.toString(), name: tag.name },
          )
        : [],
      copyright: song.copyright ?? null,
      comments: song.comments ?? null,
      ccliNumber: song.ccliNumber ?? null,
      searchTitle: song.searchTitle ?? null,
      searchLyrics: song.searchLyrics ?? null,
      openlpMapping: song.openlpMapping ?? null,
      createdAt: songDoc.createdAt,
      updatedAt: songDoc.updatedAt,
    };

    // Ensure activeVerseIndex is always a number (default to 0 if missing/invalid)
    const activeVerseIndex =
      typeof activeItem.activeVerseIndex === 'number' &&
      !isNaN(activeItem.activeVerseIndex)
        ? activeItem.activeVerseIndex
        : 0;

    return {
      servicePlan: {
        id: servicePlan._id.toString(),
        name: servicePlan.name,
      },
      item: {
        id: activeItem._id?.toString(),
        songId: activeItem.songId,
        songTitle: activeItem.songTitle,
        order: activeItem.order ?? 0,
        activeVerseIndex: activeVerseIndex,
      },
      song: transformedSong,
    };
  }

  async delete(id: string) {
    const result = await this.servicePlanModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Service plan with ID ${id} not found`);
    }
    await this.websocketServer.broadcastActiveSong();
    return result;
  }
}
