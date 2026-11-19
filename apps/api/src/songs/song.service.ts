import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Song, SongDocument } from '../schemas/song.schema';
import { Tag, TagDocument } from '../schemas/tag.schema';
import { CreateSongDto } from './dto/create-song.dto';
import { OpenLpSaveSongDto } from './dto/openlp-save-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { QuerySongDto } from './dto/query-song.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditLogAction } from '../schemas/audit-log.schema';
import { SongsVersionService } from './songs-version.service';
import { SongVersionService } from './song-version.service';
import * as archiver from 'archiver';
import { generateSongXml, sanitizeFilename } from './utils/xml-export.util';
import {
  createOpenLPSqliteDatabase,
  formatOpenlpDatabaseLyrics,
  getEffectiveVerseOrder,
} from './utils/sqlite-export.util';
import {
  normalizeVerseOrderString,
  defaultVerseOrderFromVerses,
  normalizeSearchText,
  buildSearchTitleFolded,
  buildSearchLyricsFolded,
  escapeRegexForSearch,
} from '@openlp/shared';
import * as fs from 'fs';
import { detectSongEditSource } from './utils/edit-source.util';
import { buildOpenlpCreateLookup } from './utils/openlp-upsert.util';

interface SqliteCacheEntry {
  filePath: string;
  timestamp: number;
}

@Injectable()
export class SongService {
  // Cache for SQLite export (1 minutes TTL)
  private sqliteCache: SqliteCacheEntry | null = null;
  private readonly SQLITE_CACHE_TTL = 1 * 60 * 1000; // 2 minutes in milliseconds

  constructor(
    @InjectModel(Song.name) private songModel: Model<SongDocument>,
    @InjectModel(Tag.name) private tagModel: Model<TagDocument>,
    private auditLogService: AuditLogService,
    private songsVersionService: SongsVersionService,
    private songVersionService: SongVersionService,
  ) {}

  private buildOpenlpMappingFromDto(
    dto?: { openlpId?: number; lastSyncedAt?: string; clientId?: string },
    existing?: {
      openlpId?: number;
      lastSyncedAt?: Date;
      syncMetadata?: Record<string, unknown>;
    } | null,
  ) {
    if (!dto || dto.openlpId == null) {
      return undefined;
    }
    const syncMetadata: Record<string, unknown> = {
      ...(existing?.syncMetadata ?? {}),
    };
    if (dto.clientId) {
      syncMetadata.clientId = dto.clientId;
    }
    return {
      openlpId: dto.openlpId,
      lastSyncedAt: dto.lastSyncedAt ? new Date(dto.lastSyncedAt) : new Date(),
      syncMetadata,
    };
  }

  /**
   * OpenLP desktop may POST without PATCH. Match existing row without relying on openlpMapping.
   */
  private async findExistingForOpenlpCreate(createSongDto: CreateSongDto) {
    const lookup = buildOpenlpCreateLookup(createSongDto);

    if (lookup.byRemoteId) {
      const byId = await this.songModel
        .findOne({ _id: lookup.byRemoteId, deletedAt: null })
        .exec();
      if (byId) {
        return byId;
      }
    }

    if (lookup.byOpenlpId != null) {
      const byMapping = await this.songModel
        .findOne({
          'openlpMapping.openlpId': lookup.byOpenlpId,
          deletedAt: null,
        })
        .exec();
      if (byMapping) {
        return byMapping;
      }
    }

    if (!lookup.searchTitleFolded) {
      return null;
    }

    if (lookup.number) {
      const byTitleAndNumber = await this.songModel
        .findOne({
          deletedAt: null,
          searchTitleFolded: lookup.searchTitleFolded,
          number: lookup.number,
        })
        .exec();
      if (byTitleAndNumber) {
        return byTitleAndNumber;
      }
    }

    const candidates = await this.songModel
      .find({
        deletedAt: null,
        searchTitleFolded: lookup.searchTitleFolded,
      })
      .limit(2)
      .exec();
    return candidates.length === 1 ? candidates[0] : null;
  }

  async saveFromOpenlp(
    dto: OpenLpSaveSongDto,
    context?: {
      userId?: string;
      username?: string;
      discordId?: string;
      avatar?: string | null;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    /** Same audit action + metadata shape as PATCH from the web UI (still metadata.source=openlp). */
    const saveOpts = { auditAsWebAction: true as const };
    const mongoId = (dto.id || '').trim();
    if (mongoId && Types.ObjectId.isValid(mongoId)) {
      const existing = await this.songModel
        .findOne({ _id: mongoId, deletedAt: null })
        .exec();
      if (existing) {
        const { id: _ignored, ...updateBody } = dto;
        return this.update(
          mongoId,
          updateBody,
          context?.userId,
          context?.username,
          context?.discordId,
          context?.ipAddress,
          context?.userAgent,
          context?.avatar ?? null,
          saveOpts,
        );
      }
    }

    const { id: _ignored, ...createBody } = dto;
    return this.create(createBody, {
      ...context,
      auditAsWebAction: true,
    });
  }

  async create(
    createSongDto: CreateSongDto,
    context?: {
      userId?: string;
      username?: string;
      discordId?: string;
      avatar?: string | null;
      ipAddress?: string;
      userAgent?: string;
      auditAsWebAction?: boolean;
    },
  ) {
    const existingForUpsert =
      await this.findExistingForOpenlpCreate(createSongDto);
    if (existingForUpsert) {
      const saveOptions = context?.auditAsWebAction
        ? { auditAsWebAction: true as const }
        : undefined;
      return this.update(
        existingForUpsert._id.toString(),
        createSongDto,
        context?.userId,
        context?.username,
        context?.discordId,
        context?.ipAddress,
        context?.userAgent,
        context?.avatar ?? null,
        saveOptions,
      );
    }

    const { verses, tags, verseOrder, openlpMapping, ...songData } =
      createSongDto;

    // Create or get tags
    const tagIds: string[] = [];
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        let tag = await this.tagModel.findOne({ name: tagName });
        if (!tag) {
          tag = await this.tagModel.create({ name: tagName });
        }
        tagIds.push(tag._id.toString());
      }
    }

    // Generate search_title for OpenLP compatibility (lowercase title for searching)
    const searchTitle = (songData.title || '').toLowerCase().trim();

    // Generate search_lyrics for OpenLP compatibility (lowercase verses for searching)
    // Convert verses array to string for search
    const versesString = Array.isArray(verses)
      ? verses.map((v) => v.content).join('\n\n')
      : verses || '';
    const searchLyrics = versesString.toLowerCase().trim();

    // Sort verses by order to ensure correct sequence
    const sortedVerses = Array.isArray(verses)
      ? [...verses].sort((a, b) => a.order - b.order)
      : [];

    // verse_order: use provided (normalized), or fill from verses when empty
    const verseOrderValue =
      verseOrder != null && String(verseOrder).trim() !== ''
        ? normalizeVerseOrderString(verseOrder) || null
        : sortedVerses.length > 0
          ? defaultVerseOrderFromVerses(sortedVerses)
          : null;

    // Create song - verses is now an array of objects with order
    const mapping = this.buildOpenlpMappingFromDto(
      openlpMapping
        ? {
            ...openlpMapping,
            clientId:
              openlpMapping.clientId ??
              (songData as { clientId?: string }).clientId,
          }
        : undefined,
    );

    const searchLyricsValue = songData.searchLyrics || searchLyrics;
    const searchTitleFolded = buildSearchTitleFolded(
      songData.title || '',
      songData.number ?? null,
    );
    const searchLyricsFolded = buildSearchLyricsFolded(searchLyricsValue);

    const song = await this.songModel.create({
      ...songData,
      language: songData.language || 'en',
      verses: sortedVerses, // Store as array with order preserved
      verseOrder: verseOrderValue, // verse_order in short format (v1 v2 c1), or default from verses
      // lyricsXml (string) is stored directly from SQLite lyrics column (1:1 transparent)
      tags: tagIds,
      searchTitle, // Auto-generate from title
      searchLyrics: searchLyricsValue, // Auto-generate from verses if not provided
      searchTitleFolded,
      searchLyricsFolded,
      openlpMapping: mapping ?? null,
    });

    const newId = song._id.toString();
    const catalogVersion = await this.songsVersionService
      .incrementVersion(newId, 'create')
      .catch((err) => {
        console.error('Failed to increment songs version:', err);
        return undefined;
      });

    const editSource = detectSongEditSource(context?.userAgent, {
      clientId:
        (mapping?.syncMetadata as { clientId?: string } | undefined)
          ?.clientId ?? (songData as { clientId?: string }).clientId,
      openlpId: mapping?.openlpId,
    });

    const songObject = song.toObject();
    await this.songVersionService
      .createVersion(
        newId,
        songObject,
        context?.userId,
        context?.username,
        context?.discordId,
        editSource === 'openlp' ? 'Utworzenie z OpenLP' : 'Utworzenie pieśni',
        undefined,
        {
          changeSource: editSource,
          catalogVersion,
          clientId: (mapping?.syncMetadata as { clientId?: string })?.clientId,
          openlpId: mapping?.openlpId,
        },
      )
      .catch((err) =>
        console.error('Failed to create initial song version:', err),
      );

    if (context?.userId && context?.username) {
      const action =
        editSource === 'openlp' && !context.auditAsWebAction
          ? AuditLogAction.SONG_CREATE_OPENLP
          : AuditLogAction.SONG_CREATE;
      await this.auditLogService
        .log(action, context.userId, context.username, {
          discordId: context.discordId,
          avatar: context.avatar,
          songId: newId,
          songTitle: song.title,
          metadata: {
            source: editSource,
            catalogVersion,
            openlpId: mapping?.openlpId ?? null,
            clientId:
              (mapping?.syncMetadata as { clientId?: string } | undefined)
                ?.clientId ?? null,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        })
        .catch((err) => console.error('Failed to log song create audit:', err));
    } else if (context && (!context.userId || !context.username)) {
      console.warn(
        'Song create succeeded but audit log skipped: missing userId or username on authenticated create',
        { userId: context.userId, username: context.username },
      );
    }

    return this.findOne(newId);
  }

  async findAll(query: QuerySongDto) {
    const {
      page = 1,
      limit = 150,
      language,
      tags,
      search,
      sortBy = 'title',
      sortOrder = 'asc',
      songbook,
    } = query;
    const skip = (page - 1) * limit;

    const filter: any = {
      deletedAt: null,
    };

    if (language) {
      filter.language = language;
    }

    // Filter by songbook (category)
    if (songbook) {
      if (songbook === 'zborowe') {
        // "zborowe" means songs that are NOT in any songbook ('pielgrzym', 'zielony', or 'wedrowiec')
        filter.songbook = { $nin: ['pielgrzym', 'zielony', 'wedrowiec'] };
      } else {
        filter.songbook = songbook;
      }
    }

    if (tags && tags.length > 0) {
      // Find tag IDs by names
      const tagDocs = await this.tagModel.find({ name: { $in: tags } });
      const tagIds = tagDocs.map((t) => t._id.toString());
      filter.tags = { $in: tagIds };
    }

    if (search) {
      const normalizedQuery = normalizeSearchText(search);
      if (normalizedQuery) {
        const regexPattern = escapeRegexForSearch(normalizedQuery);
        filter.$or = [
          { searchTitleFolded: { $regex: regexPattern, $options: 'i' } },
          { searchLyricsFolded: { $regex: regexPattern, $options: 'i' } },
          // Fallback for documents not yet backfilled
          { searchTitle: { $regex: regexPattern, $options: 'i' } },
          { searchLyrics: { $regex: regexPattern, $options: 'i' } },
          { title: { $regex: regexPattern, $options: 'i' } },
          { 'verses.content': { $regex: regexPattern, $options: 'i' } },
        ];
      }
    }

    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Select only needed fields for better performance
    const selectFields =
      'title number language verses verseOrder lyricsXml tags copyright comments ccliNumber searchTitle searchLyrics openlpMapping songbook createdAt updatedAt';

    const [songs, total] = await Promise.all([
      this.songModel
        .find(filter)
        .select(selectFields)
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .populate('tags', 'name color parentId') // Include color and parentId for advanced tags
        .lean()
        .exec(),
      this.songModel.countDocuments(filter),
    ]);

    // Transform to match expected format
    const transformedSongs = songs.map((song: any) => {
      // Convert verses array to string for backward compatibility (frontend expects string)
      // But preserve order from verse.order
      let versesString = '';
      if (Array.isArray(song.verses) && song.verses.length > 0) {
        // Sort by order and join content
        const sortedVerses = [...song.verses].sort(
          (a: any, b: any) => a.order - b.order,
        );
        versesString = sortedVerses.map((v: any) => v.content).join('\n\n');
      } else if (typeof song.verses === 'string') {
        // Backward compatibility: if verses is still a string, use it
        versesString = song.verses;
      }

      return {
        id: song._id.toString(),
        title: song.title,
        number: song.number,
        language: song.language,
        verses: versesString, // Convert array to string for frontend compatibility
        verseOrder: song.verseOrder || null, // verse_order string from OpenLP SQLite (1:1 transparent)
        lyricsXml: song.lyricsXml || null, // Exact XML from SQLite lyrics column (1:1 transparent)
        tags: song.tags.map((tag: any) => ({
          id: tag._id.toString(),
          name: tag.name,
        })),
        // OpenLP compatibility fields
        copyright: song.copyright,
        comments: song.comments,
        ccliNumber: song.ccliNumber,
        searchTitle: song.searchTitle,
        searchLyrics: song.searchLyrics,
        openlpMapping: song.openlpMapping,
        songbook: song.songbook || null, // Songbook category: 'pielgrzym', 'zielony', 'wedrowiec', 'zborowe'
        createdAt: song.createdAt,
        updatedAt: song.updatedAt,
      };
    });

    return {
      data: transformedSongs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const song = await this.songModel
      .findOne({ _id: id, deletedAt: null })
      .populate('tags', 'name color parentId') // Include color and parentId for advanced tags
      .lean()
      .exec();

    if (!song) {
      throw new NotFoundException(`Song with ID ${id} not found`);
    }

    // Return verses as array with originalLabel (for frontend logic) and also as string (for backward compatibility)
    let versesArray: Array<{
      order: number;
      content: string;
      label?: string;
      originalLabel?: string;
    }> = [];
    let versesString = '';
    if (Array.isArray(song.verses) && song.verses.length > 0) {
      // Sort by order
      const sortedVerses = [...song.verses].sort(
        (a: any, b: any) => a.order - b.order,
      );
      versesArray = sortedVerses.map((v: any) => ({
        order: v.order,
        content: v.content,
        label: v.label,
        originalLabel: v.originalLabel, // Include originalLabel for frontend logic
      }));
      versesString = sortedVerses.map((v: any) => v.content).join('\n\n');
    } else if (typeof song.verses === 'string') {
      // Backward compatibility: if verses is still a string, use it
      versesString = song.verses;
    }

    // Transform to match expected format
    return {
      id: song._id.toString(),
      title: song.title,
      number: song.number,
      language: song.language,
      verses: versesString, // Keep as string for backward compatibility
      versesArray: versesArray.length > 0 ? versesArray : undefined, // Add array with originalLabel for frontend logic
      verseOrder: song.verseOrder || null, // verse_order string from OpenLP SQLite (1:1 transparent)
      lyricsXml: song.lyricsXml || null, // Exact XML from SQLite lyrics column (1:1 transparent)
      tags: song.tags.map((tag: any) => ({
        id: tag._id.toString(),
        name: tag.name,
      })),
      // OpenLP compatibility fields
      copyright: song.copyright,
      comments: song.comments,
      ccliNumber: song.ccliNumber,
      searchTitle: song.searchTitle,
      searchLyrics: song.searchLyrics,
      openlpMapping: song.openlpMapping,
      songbook: (song as any).songbook || null, // Songbook category: 'pielgrzym', 'zielony', 'zborowe'
      createdAt: (song as any).createdAt || new Date(),
      updatedAt: (song as any).updatedAt || new Date(),
    };
  }

  async update(
    id: string,
    updateSongDto: UpdateSongDto,
    userId?: string,
    username?: string,
    discordId?: string,
    ipAddress?: string,
    userAgent?: string,
    avatar?: string | null,
    saveOptions?: { auditAsWebAction?: boolean },
  ) {
    const { verses, tags, verseOrder, openlpMapping, ...songData } =
      updateSongDto;

    // Check if song exists
    const existing = await this.songModel.findOne({ _id: id, deletedAt: null });
    if (!existing) {
      throw new NotFoundException(`Song with ID ${id} not found`);
    }

    const updateData: any = { ...songData };

    // Regenerate search_title if title changed (for OpenLP compatibility)
    if (songData.title) {
      updateData.searchTitle = songData.title.toLowerCase().trim();
    }

    // Handle verseOrder - use from DTO if provided (normalized), or fill from verses when empty
    if (verseOrder !== undefined) {
      const trimmed = verseOrder != null ? String(verseOrder).trim() : '';
      updateData.verseOrder =
        trimmed !== '' ? normalizeVerseOrderString(verseOrder) || null : null; // null = will be filled from verses below if any
    }

    // Handle verses - now an array of objects with order
    // Also regenerate search_lyrics when verses change
    if (verses !== undefined) {
      if (Array.isArray(verses)) {
        // Sort verses by order to ensure correct sequence
        const sortedVerses = [...verses].sort((a, b) => a.order - b.order);
        updateData.verses = sortedVerses;
        // Fill verseOrder from verses when empty
        if (
          (updateData.verseOrder == null || updateData.verseOrder === '') &&
          sortedVerses.length > 0
        ) {
          updateData.verseOrder = defaultVerseOrderFromVerses(sortedVerses);
        }
        // Generate search_lyrics from verse content
        const versesString = sortedVerses.map((v) => v.content).join('\n\n');
        updateData.searchLyrics = versesString.toLowerCase().trim();
      } else {
        // Backward compatibility: if verses is still a string, convert to array
        // Split by double newlines and assign order based on position
        const verseContents = (verses as string)
          .split(/\n\n+/)
          .filter((v) => v.trim());
        const convertedVerses = verseContents.map((content, index) => ({
          order: index + 1,
          content: content.trim(),
        }));
        updateData.verses = convertedVerses;
        // Fill verseOrder from verses when empty
        if (
          (updateData.verseOrder == null || updateData.verseOrder === '') &&
          convertedVerses.length > 0
        ) {
          updateData.verseOrder = defaultVerseOrderFromVerses(convertedVerses);
        }
        updateData.searchLyrics = (verses as string).toLowerCase().trim();
      }
    }

    // Fill verseOrder from existing verses when still empty (e.g. PATCH without verses in body)
    if (
      (updateData.verseOrder == null || updateData.verseOrder === '') &&
      Array.isArray(existing.verses) &&
      existing.verses.length > 0
    ) {
      updateData.verseOrder = defaultVerseOrderFromVerses(existing.verses);
    }

    // Handle tags (OpenLP may send tags: null)
    if (tags !== undefined) {
      if (tags === null || (Array.isArray(tags) && tags.length === 0)) {
        updateData.tags = [];
      } else if (Array.isArray(tags)) {
        const tagIds: string[] = [];
        for (const tagName of tags) {
          let tag = await this.tagModel.findOne({ name: tagName });
          if (!tag) {
            tag = await this.tagModel.create({ name: tagName });
          }
          tagIds.push(tag._id.toString());
        }
        updateData.tags = tagIds;
      }
    }

    if (openlpMapping !== undefined) {
      updateData.openlpMapping = this.buildOpenlpMappingFromDto(
        openlpMapping,
        existing.openlpMapping,
      );
    }

    const finalTitle = (updateData.title ?? existing.title) as string;
    const finalNumber =
      updateData.number !== undefined ? updateData.number : existing.number;
    const finalSearchLyrics = (updateData.searchLyrics ??
      existing.searchLyrics ??
      '') as string;
    updateData.searchTitleFolded = buildSearchTitleFolded(
      finalTitle,
      finalNumber,
    );
    updateData.searchLyricsFolded = buildSearchLyricsFolded(finalSearchLyrics);

    // Track changes for audit log
    const changes: Record<string, any> = {};

    // Check each field in updateData
    Object.keys(updateData).forEach((key) => {
      // Skip internal fields
      if (
        key === 'searchTitle' ||
        key === 'searchLyrics' ||
        key === 'searchTitleFolded' ||
        key === 'searchLyricsFolded'
      ) {
        return;
      }

      const oldValue = (existing as any)[key];
      const newValue = updateData[key];

      // Compare values (handle arrays and objects)
      let hasChanged = false;
      if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);
      } else if (
        typeof oldValue === 'object' &&
        typeof newValue === 'object' &&
        oldValue !== null &&
        newValue !== null
      ) {
        hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);
      } else {
        hasChanged = oldValue !== newValue;
      }

      if (hasChanged) {
        changes[key] = {
          old: oldValue ?? null,
          new: newValue ?? null,
        };
      }
    });

    // Handle tags separately (tags are handled as array of IDs in updateData, but we want to show names)
    if (tags !== undefined) {
      // Get old tag names
      const oldTags = existing.tags as any[];
      const oldTagNames =
        oldTags && oldTags.length > 0
          ? oldTags
              .map((tag: any) => tag.name || tag.toString())
              .sort()
              .join(', ')
          : '';

      const newTagNames =
        tags != null && Array.isArray(tags) && tags.length > 0
          ? [...tags].sort().join(', ')
          : '';

      if (oldTagNames !== newTagNames) {
        changes.tags = {
          old: oldTagNames || '(brak)',
          new: newTagNames || '(brak)',
        };
      }
    }

    const mergedMapping = updateData.openlpMapping ?? existing.openlpMapping;
    const editSource = detectSongEditSource(userAgent, {
      clientId: (
        mergedMapping?.syncMetadata as { clientId?: string } | undefined
      )?.clientId,
      openlpId: mergedMapping?.openlpId,
    });

    // Create version snapshot before update (save current state)
    const currentSongData = existing.toObject();
    const storedRevision = await this.songVersionService
      .createVersion(
        id,
        currentSongData,
        userId,
        username,
        discordId,
        editSource === 'openlp' ? 'Zapis z OpenLP' : undefined,
        Object.keys(changes).length > 0 ? changes : undefined,
        {
          changeSource: editSource,
          clientId: (mergedMapping?.syncMetadata as { clientId?: string })
            ?.clientId,
          openlpId: mergedMapping?.openlpId,
        },
      )
      .catch((err) => {
        console.error('Failed to create song version:', err);
        return null;
      });

    // Update song
    await this.songModel.updateOne({ _id: id }, updateData);

    const catalogVersion = await this.songsVersionService
      .incrementVersion(id, 'update')
      .catch((err) => {
        console.error('Failed to increment songs version:', err);
        return undefined;
      });

    if (
      storedRevision &&
      catalogVersion != null &&
      storedRevision.catalogVersion == null
    ) {
      storedRevision.catalogVersion = catalogVersion;
      await storedRevision.save().catch(() => undefined);
    }

    // Log audit trail if user is authenticated
    if (userId && username) {
      const auditAction =
        editSource === 'openlp' && !saveOptions?.auditAsWebAction
          ? AuditLogAction.SONG_EDIT_OPENLP
          : AuditLogAction.SONG_EDIT;
      await this.auditLogService
        .log(auditAction, userId, username, {
          discordId,
          avatar,
          songId: id,
          songTitle: (updateData.title || existing.title) as string,
          metadata: {
            source: editSource,
            catalogVersion,
            storedRevision: storedRevision?.version ?? null,
            openlpId: mergedMapping?.openlpId ?? null,
            clientId:
              (mergedMapping?.syncMetadata as { clientId?: string } | undefined)
                ?.clientId ?? null,
            changes: Object.keys(changes).length > 0 ? changes : undefined,
          },
          ipAddress,
          userAgent,
        })
        .catch((err) => console.error('Failed to log audit trail:', err));
    }

    return this.findOne(id);
  }

  async restoreToRevision(
    id: string,
    revision: number,
    user?: {
      id?: string;
      username?: string;
      discordId?: string;
      avatar?: string | null;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    await this.songVersionService.restoreVersion(
      id,
      revision,
      user?.id,
      user?.username,
      user?.discordId,
    );

    const catalogVersion = await this.songsVersionService
      .incrementVersion(id, 'update')
      .catch((err) => {
        console.error('Failed to increment songs version after restore:', err);
        return undefined;
      });

    const restored = await this.findOne(id);

    if (user?.id && user?.username) {
      await this.auditLogService
        .log(AuditLogAction.SONG_RESTORE_VERSION, user.id, user.username, {
          discordId: user.discordId,
          avatar: user.avatar,
          songId: id,
          songTitle: restored.title,
          metadata: {
            restoredFromRevision: revision,
            catalogVersion,
            source: 'web',
          },
          ipAddress: user.ipAddress,
          userAgent: user.userAgent,
        })
        .catch((err) => console.error('Failed to log restore audit:', err));
    }

    return restored;
  }

  async remove(
    id: string,
    userId?: string,
    username?: string,
    discordId?: string,
    ipAddress?: string,
    userAgent?: string,
    avatar?: string | null,
  ): Promise<void> {
    // Get song before deletion for audit log
    const song = await this.songModel.findOne({ _id: id, deletedAt: null });

    if (!song) {
      throw new NotFoundException(`Song with ID ${id} not found`);
    }

    // Soft delete
    await this.songModel.updateOne({ _id: id }, { deletedAt: new Date() });

    await this.songsVersionService
      .incrementVersion(id, 'delete')
      .catch((err) => console.error('Failed to increment songs version:', err));

    // Log audit trail if user is authenticated
    if (userId && username) {
      await this.auditLogService
        .log(AuditLogAction.SONG_DELETE, userId, username, {
          discordId,
          avatar,
          songId: id,
          songTitle: song.title,
          ipAddress,
          userAgent,
        })
        .catch((err) => console.error('Failed to log audit trail:', err));
    }
  }

  /**
   * Get all songs list (lightweight, for caching) - only metadata, no full content
   */
  async findAllForCache() {
    const songs = await this.songModel
      .find({ deletedAt: null })
      .select(
        'title number language tags searchTitle searchLyrics verses verseOrder lyricsXml songbook copyright comments ccliNumber openlpMapping updatedAt',
      )
      .populate('tags', 'name color parentId') // Include color and parentId for advanced tags
      .sort({ title: 1 })
      .lean()
      .exec();

    // Transform to lightweight format (only fields needed for search and display)
    const transformedSongs = songs.map((song: any) => ({
      id: song._id.toString(),
      title: song.title,
      number: song.number,
      language: song.language,
      tags: song.tags.map((tag: any) => ({
        id: tag._id.toString(),
        name: tag.name,
      })),
      verses: song.verses ?? null,
      versesArray:
        Array.isArray(song.verses) && song.verses.length > 0
          ? song.verses.map((v: any) => ({
              order: v.order,
              content: v.content,
              label: v.label,
              originalLabel: v.originalLabel, // Include originalLabel for frontend logic
            }))
          : undefined,
      verseOrder: song.verseOrder || null, // verse_order string from OpenLP SQLite (1:1 transparent)
      lyricsXml: song.lyricsXml || null, // Exact XML from SQLite lyrics column (1:1 transparent)
      searchTitle: song.searchTitle,
      searchLyrics: song.searchLyrics,
      songbook: song.songbook || null, // Songbook category: 'pielgrzym', 'zielony', 'zborowe'
      copyright: song.copyright || null,
      comments: song.comments || null,
      ccliNumber: song.ccliNumber || null,
      openlpMapping: song.openlpMapping
        ? {
            openlpId: song.openlpMapping.openlpId ?? null,
            lastSyncedAt: song.openlpMapping.lastSyncedAt
              ? new Date(song.openlpMapping.lastSyncedAt).toISOString()
              : null,
            clientId:
              (song.openlpMapping.syncMetadata as { clientId?: string })
                ?.clientId ?? null,
          }
        : null,
      updatedAt: song.updatedAt ? new Date(song.updatedAt).toISOString() : null,
    }));

    return transformedSongs;
  }

  /**
   * Song list for OpenLP desktop sync: same fields as findAllForCache, but lyricsXml is the
   * full OpenLP SQLite `songs.lyrics` document (via formatSongLyrics), not raw Mongo fragments.
   */
  async findAllForOpenlpCache() {
    const songs = await this.songModel
      .find({ deletedAt: null })
      .select(
        'title number language tags searchTitle searchLyrics verses verseOrder lyricsXml songbook copyright comments ccliNumber openlpMapping updatedAt',
      )
      .populate('tags', 'name color parentId')
      .sort({ title: 1 })
      .lean()
      .exec();

    return songs.map((song: any) => {
      const versesArray =
        Array.isArray(song.verses) && song.verses.length > 0
          ? song.verses.map((v: any) => ({
              order: v.order,
              content: v.content,
              label: v.label,
              originalLabel: v.originalLabel,
            }))
          : undefined;

      const lyricsXml =
        formatOpenlpDatabaseLyrics({
          verses: song.verses,
          versesArray,
          verseOrder: song.verseOrder,
          lyricsXml: song.lyricsXml,
        }) || null;

      const verseOrder =
        getEffectiveVerseOrder({
          id: song._id.toString(),
          title: song.title || '',
          number: song.number || null,
          language: song.language || 'en',
          verses: '',
          versesArray,
          verseOrder: song.verseOrder || null,
          lyricsXml: song.lyricsXml || null,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        }) ??
        song.verseOrder ??
        null;

      return {
        id: song._id.toString(),
        title: song.title,
        number: song.number,
        language: song.language,
        tags: song.tags.map((tag: any) => ({
          id: tag._id.toString(),
          name: tag.name,
        })),
        verses: song.verses ?? null,
        versesArray,
        verseOrder,
        lyricsXml,
        searchTitle: song.searchTitle,
        searchLyrics: song.searchLyrics,
        songbook: song.songbook || null,
        copyright: song.copyright || null,
        comments: song.comments || null,
        ccliNumber: song.ccliNumber || null,
        openlpMapping: song.openlpMapping
          ? {
              openlpId: song.openlpMapping.openlpId ?? null,
              lastSyncedAt: song.openlpMapping.lastSyncedAt
                ? new Date(song.openlpMapping.lastSyncedAt).toISOString()
                : null,
              clientId:
                (song.openlpMapping.syncMetadata as { clientId?: string })
                  ?.clientId ?? null,
            }
          : null,
        updatedAt: song.updatedAt
          ? new Date(song.updatedAt).toISOString()
          : null,
      };
    });
  }

  /**
   * OpenLP incremental pull: aggregate changelog since stored catalog version.
   * Falls back to full catalog when changelog has no rows yet (legacy deployments).
   */
  async findChangesForOpenlpSince(sinceVersion: number) {
    const currentVersion = await this.songsVersionService.getVersion();
    if (sinceVersion >= currentVersion) {
      return {
        version: currentVersion,
        sinceVersion,
        deletedSongIds: [] as string[],
        songs: [],
        full: false,
      };
    }

    const rawChanges =
      await this.songsVersionService.getChangesSince(sinceVersion);

    if (
      rawChanges.length === 0 &&
      sinceVersion > 0 &&
      sinceVersion < currentVersion
    ) {
      const songs = await this.findAllForOpenlpCache();
      return {
        version: currentVersion,
        sinceVersion,
        deletedSongIds: [] as string[],
        songs,
        full: true,
      };
    }

    const latestBySong = new Map<
      string,
      { action: 'create' | 'update' | 'delete' }
    >();
    for (const row of rawChanges) {
      latestBySong.set(row.songId, { action: row.action });
    }

    const deletedSongIds: string[] = [];
    const upsertIds: string[] = [];
    for (const [songId, { action }] of latestBySong) {
      if (action === 'delete') {
        deletedSongIds.push(songId);
      } else {
        upsertIds.push(songId);
      }
    }

    const songs =
      upsertIds.length > 0 ? await this.findOpenlpCacheByIds(upsertIds) : [];

    return {
      version: currentVersion,
      sinceVersion,
      deletedSongIds,
      songs,
      full: false,
    };
  }

  async findOpenlpCacheByIds(ids: string[]) {
    const objectIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (objectIds.length === 0) {
      return [];
    }

    const songs = await this.songModel
      .find({ _id: { $in: objectIds }, deletedAt: null })
      .select(
        'title number language tags searchTitle searchLyrics verses verseOrder lyricsXml songbook copyright comments ccliNumber openlpMapping updatedAt',
      )
      .populate('tags', 'name color parentId')
      .sort({ title: 1 })
      .lean()
      .exec();

    return songs.map((song: any) => {
      const versesArray =
        Array.isArray(song.verses) && song.verses.length > 0
          ? song.verses.map((v: any) => ({
              order: v.order,
              content: v.content,
              label: v.label,
              originalLabel: v.originalLabel,
            }))
          : undefined;

      const lyricsXml =
        formatOpenlpDatabaseLyrics({
          verses: song.verses,
          versesArray,
          verseOrder: song.verseOrder,
          lyricsXml: song.lyricsXml,
        }) || null;

      const verseOrder =
        getEffectiveVerseOrder({
          id: song._id.toString(),
          title: song.title || '',
          number: song.number || null,
          language: song.language || 'en',
          verses: '',
          versesArray,
          verseOrder: song.verseOrder || null,
          lyricsXml: song.lyricsXml || null,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        }) ??
        song.verseOrder ??
        null;

      return {
        id: song._id.toString(),
        title: song.title,
        number: song.number,
        language: song.language,
        tags: song.tags.map((tag: any) => ({
          id: tag._id.toString(),
          name: tag.name,
        })),
        verses: song.verses ?? null,
        versesArray,
        verseOrder,
        lyricsXml,
        searchTitle: song.searchTitle,
        searchLyrics: song.searchLyrics,
        songbook: song.songbook || null,
        copyright: song.copyright || null,
        comments: song.comments || null,
        ccliNumber: song.ccliNumber || null,
        openlpMapping: song.openlpMapping
          ? {
              openlpId: song.openlpMapping.openlpId ?? null,
              lastSyncedAt: song.openlpMapping.lastSyncedAt
                ? new Date(song.openlpMapping.lastSyncedAt).toISOString()
                : null,
              clientId:
                (song.openlpMapping.syncMetadata as { clientId?: string })
                  ?.clientId ?? null,
            }
          : null,
        updatedAt: song.updatedAt
          ? new Date(song.updatedAt).toISOString()
          : null,
      };
    });
  }

  /**
   * Get current version of songs collection
   */
  async getVersion(): Promise<number> {
    return this.songsVersionService.getVersion();
  }

  /**
   * Export all songs to ZIP archive with XML files
   * Each song is exported as a separate XML file named after the song title
   */
  async exportAllToZip(): Promise<archiver.Archiver> {
    // Fetch all non-deleted songs
    const songs = await this.songModel
      .find({ deletedAt: null })
      .populate('tags', 'name')
      .lean()
      .exec();

    // Create archiver stream
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    // Transform songs to match expected format
    const transformedSongs = songs.map((song: any) => ({
      id: song._id.toString(),
      title: song.title || '',
      number: song.number || null,
      language: song.language || 'en',
      verses: typeof song.verses === 'string' ? song.verses : song.verses || '',
      verseOrder: song.verseOrder || null, // verse_order string for OpenLyrics format
      lyricsXml: song.lyricsXml || null, // Exact XML from SQLite lyrics column (1:1 transparent)
      tags: (song.tags || []).map((tag: any) => ({
        id: tag._id?.toString() || tag.toString(),
        name: tag.name || tag,
      })),
      copyright: song.copyright || null,
      comments: song.comments || null,
      ccliNumber: song.ccliNumber || null,
    }));

    // Generate XML for each song and add to archive
    for (const song of transformedSongs) {
      const xmlContent = generateSongXml(song);
      const filename = `${sanitizeFilename(song.title)}.xml`;
      archive.append(xmlContent, { name: filename });
    }

    // Finalize the archive
    archive.finalize();

    return archive;
  }

  /**
   * Export all songs to OpenLP SQLite database file
   * Returns the path to the temporary SQLite file
   * Uses cache with 2 minutes TTL to avoid regenerating the same file
   */
  async exportToSqlite(): Promise<string> {
    // Check cache first
    const now = Date.now();
    if (
      this.sqliteCache &&
      now - this.sqliteCache.timestamp < this.SQLITE_CACHE_TTL
    ) {
      // Check if cached file still exists
      if (fs.existsSync(this.sqliteCache.filePath)) {
        return this.sqliteCache.filePath;
      } else {
        // File was deleted, clear cache
        this.sqliteCache = null;
      }
    }

    // Cache expired or doesn't exist, generate new file
    // Fetch all non-deleted songs
    const songs = await this.songModel
      .find({ deletedAt: null })
      .populate('tags', 'name')
      .lean()
      .exec();

    // Transform songs to match expected format for SQLite export
    const transformedSongs: any[] = songs.map((song: any) => {
      // Convert verses array to string for backward compatibility
      let versesString = '';
      let versesArray: Array<{
        order: number;
        content: string;
        label?: string;
        originalLabel?: string;
      }> = [];

      if (Array.isArray(song.verses) && song.verses.length > 0) {
        // Sort by order
        const sortedVerses = [...song.verses].sort(
          (a: any, b: any) => a.order - b.order,
        );
        versesArray = sortedVerses.map((v: any) => ({
          order: v.order,
          content: v.content,
          label: v.label,
          originalLabel: v.originalLabel,
        }));
        versesString = sortedVerses.map((v: any) => v.content).join('\n\n');
      } else if (typeof song.verses === 'string') {
        versesString = song.verses;
      }

      return {
        id: song._id.toString(),
        title: song.title || '',
        number: song.number || null,
        language: song.language || 'en',
        verses: versesString, // String format for SQLite export utility
        versesArray: versesArray.length > 0 ? versesArray : undefined,
        verseOrder: song.verseOrder || null,
        lyricsXml: song.lyricsXml || null,
        tags: (song.tags || []).map((tag: any) => ({
          id: tag._id?.toString() || tag.toString(),
          name: tag.name || tag,
        })),
        copyright: song.copyright || null,
        comments: song.comments || null,
        ccliNumber: song.ccliNumber || null,
        searchTitle: song.searchTitle,
        searchLyrics: song.searchLyrics,
        createdAt: (song as any).createdAt || new Date(),
        updatedAt: (song as any).updatedAt || new Date(),
        deletedAt: null,
      };
    });

    // Create SQLite database
    const sqlitePath = await createOpenLPSqliteDatabase(transformedSongs);

    // Update cache
    this.sqliteCache = {
      filePath: sqlitePath,
      timestamp: now,
    };

    return sqlitePath;
  }

  /**
   * Check if a file path is currently cached
   * Used to determine if file should be kept after streaming
   */
  isCached(filePath: string): boolean {
    if (!this.sqliteCache) {
      return false;
    }
    const now = Date.now();
    const isCacheValid =
      now - this.sqliteCache.timestamp < this.SQLITE_CACHE_TTL;
    return isCacheValid && this.sqliteCache.filePath === filePath;
  }
}
