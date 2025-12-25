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
import {
  exportServicePlanToOpenLP,
  exportServicePlanToOsz,
} from './utils/export-service-plan.util';
import * as crypto from 'crypto';
import * as archiver from 'archiver';

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

  /**
   * Export service plan to OpenLP XML format
   */
  async exportToOpenLP(id: string): Promise<string> {
    const servicePlan = await this.servicePlanModel.findById(id).exec();
    if (!servicePlan) {
      throw new NotFoundException(`Service plan with ID ${id} not found`);
    }

    const planForExport = {
      id: servicePlan._id.toString(),
      name: servicePlan.name,
      date: servicePlan.date,
      items: servicePlan.items.map((item: any) => ({
        songId: item.songId,
        songTitle: item.songTitle,
        order: item.order,
        notes: item.notes,
      })),
    };

    return exportServicePlanToOpenLP(planForExport);
  }

  /**
   * Export service plan to OpenLP .osz format (ZIP archive)
   */
  async exportToOsz(id: string): Promise<archiver.Archiver> {
    const servicePlan = await this.servicePlanModel.findById(id).exec();
    if (!servicePlan) {
      throw new NotFoundException(`Service plan with ID ${id} not found`);
    }

    // Fetch full song data for all items
    this.logger.log(
      `[exportToOsz] Fetching songs for ${servicePlan.items.length} items`,
    );
    const itemsWithSongs = await Promise.all(
      servicePlan.items.map(async (item: any) => {
        this.logger.debug(`[exportToOsz] Fetching song ${item.songId}`);
        const song = await this.songModel.findById(item.songId).exec();
        if (!song) {
          this.logger.warn(
            `[exportToOsz] Song with ID ${item.songId} not found for service plan ${id}`,
          );
          return {
            songId: item.songId,
            songTitle: item.songTitle,
            order: item.order,
            notes: item.notes,
            song: undefined,
          };
        }

        this.logger.debug(
          `[exportToOsz] Found song: ${song.title}, verses count: ${Array.isArray(song.verses) ? song.verses.length : 0}`,
        );

        // Ensure verses is an array
        const verses = Array.isArray(song.verses) ? song.verses : [];

        return {
          songId: item.songId,
          songTitle: item.songTitle,
          order: item.order,
          notes: item.notes,
          song: {
            title: song.title,
            verses: verses,
            verseOrder: song.verseOrder || null,
            lyricsXml: song.lyricsXml || null,
            copyright: song.copyright || null,
            comments: song.comments || null,
            ccliNumber: song.ccliNumber || null,
            authors: '', // OpenLP stores authors separately, we don't have this field
            alternateTitle: song.number || null,
            openlpId: (song.openlpMapping as any)?.openlpId || null, // OpenLP database ID if available
          },
        };
      }),
    );

    this.logger.log(
      `[exportToOsz] Fetched ${itemsWithSongs.filter((i) => i.song).length} songs with data`,
    );

    const planForExport = {
      id: servicePlan._id.toString(),
      name: servicePlan.name,
      date: servicePlan.date,
      items: itemsWithSongs,
    };

    return exportServicePlanToOsz(planForExport);
  }

  /**
   * Generate or get share token for a service plan
   */
  async generateShareToken(
    id: string,
    expiresInDays?: number,
  ): Promise<string> {
    const servicePlan = await this.servicePlanModel.findById(id).exec();
    if (!servicePlan) {
      throw new NotFoundException(`Service plan with ID ${id} not found`);
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('base64url');

    // Calculate expiration date if provided
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    servicePlan.shareToken = token;
    servicePlan.shareTokenExpiresAt = expiresAt;
    await servicePlan.save();

    return token;
  }

  /**
   * Revoke share token
   */
  async revokeShareToken(id: string): Promise<void> {
    const servicePlan = await this.servicePlanModel.findById(id).exec();
    if (!servicePlan) {
      throw new NotFoundException(`Service plan with ID ${id} not found`);
    }

    servicePlan.shareToken = undefined;
    servicePlan.shareTokenExpiresAt = undefined;
    await servicePlan.save();
  }

  /**
   * Get service plan by share token
   */
  async findByShareToken(token: string): Promise<any> {
    const servicePlan = await this.servicePlanModel
      .findOne({
        shareToken: token,
        $or: [
          { shareTokenExpiresAt: { $exists: false } },
          { shareTokenExpiresAt: null },
          { shareTokenExpiresAt: { $gt: new Date() } },
        ],
      })
      .exec();

    if (!servicePlan) {
      throw new NotFoundException('Invalid or expired share token');
    }

    return this.transformServicePlan(servicePlan);
  }

  /**
   * Generate or get control token for mobile control
   */
  async generateControlToken(
    id: string,
    expiresInDays?: number,
  ): Promise<string> {
    const servicePlan = await this.servicePlanModel.findById(id).exec();
    if (!servicePlan) {
      throw new NotFoundException(`Service plan with ID ${id} not found`);
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('base64url');

    // Calculate expiration date if provided
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    servicePlan.controlToken = token;
    servicePlan.controlTokenExpiresAt = expiresAt;
    await servicePlan.save();

    return token;
  }

  /**
   * Revoke control token
   */
  async revokeControlToken(id: string): Promise<void> {
    const servicePlan = await this.servicePlanModel.findById(id).exec();
    if (!servicePlan) {
      throw new NotFoundException(`Service plan with ID ${id} not found`);
    }

    servicePlan.controlToken = undefined;
    servicePlan.controlTokenExpiresAt = undefined;
    await servicePlan.save();
  }

  /**
   * Verify control token and get plan ID
   */
  async verifyControlToken(token: string): Promise<string> {
    const servicePlan = await this.servicePlanModel
      .findOne({
        controlToken: token,
        $or: [
          { controlTokenExpiresAt: { $exists: false } },
          { controlTokenExpiresAt: null },
          { controlTokenExpiresAt: { $gt: new Date() } },
        ],
      })
      .exec();

    if (!servicePlan) {
      throw new NotFoundException('Invalid or expired control token');
    }

    return servicePlan._id.toString();
  }

  /**
   * Control active song via control token (for mobile)
   */
  async controlActiveSong(
    controlToken: string,
    setActiveDto: SetActiveSongDto,
  ): Promise<any> {
    const planId = await this.verifyControlToken(controlToken);
    return this.setActiveSong(planId, setActiveDto);
  }

  /**
   * Control active verse via control token (for mobile)
   */
  async controlActiveVerse(
    controlToken: string,
    setActiveVerseDto: SetActiveVerseDto,
  ): Promise<any> {
    const planId = await this.verifyControlToken(controlToken);
    return this.setActiveVerse(planId, setActiveVerseDto);
  }
}
