import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Song, SongDocument } from '../schemas/song.schema';
import { Tag, TagDocument } from '../schemas/tag.schema';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { QuerySongDto } from './dto/query-song.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditLogAction } from '../schemas/audit-log.schema';
import { SongsVersionService } from './songs-version.service';
import * as archiver from 'archiver';
import { generateSongXml, sanitizeFilename } from './utils/xml-export.util';

@Injectable()
export class SongService {
  constructor(
    @InjectModel(Song.name) private songModel: Model<SongDocument>,
    @InjectModel(Tag.name) private tagModel: Model<TagDocument>,
    private auditLogService: AuditLogService,
    private songsVersionService: SongsVersionService,
  ) {}

  async create(createSongDto: CreateSongDto) {
    const { verses, tags, ...songData } = createSongDto;

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
    const searchLyrics = (verses || '').toLowerCase().trim();

    // Create song - verses is now a single string field
    const song = await this.songModel.create({
      ...songData,
      language: songData.language || 'en',
      verses: verses || '', // Store as single string
      tags: tagIds,
      searchTitle, // Auto-generate from title
      searchLyrics: songData.searchLyrics || searchLyrics, // Auto-generate from verses if not provided
    });

    // Increment version when song is created
    await this.songsVersionService.incrementVersion().catch(err => 
      console.error('Failed to increment songs version:', err)
    );

    return this.findOne(song._id.toString());
  }

  async findAll(query: QuerySongDto) {
    const { page = 1, limit = 150, language, tags, search, sortBy = 'title', sortOrder = 'asc' } = query;
    const skip = (page - 1) * limit;

    const filter: any = {
      deletedAt: null,
    };

    if (language) {
      filter.language = language;
    }

    if (tags && tags.length > 0) {
      // Find tag IDs by names
      const tagDocs = await this.tagModel.find({ name: { $in: tags } });
      const tagIds = tagDocs.map((t) => t._id.toString());
      filter.tags = { $in: tagIds };
    }

    if (search) {
      // Use indexed search fields (searchTitle, searchLyrics) for better performance
      // Also search in original fields as fallback
      const searchLower = search.toLowerCase();
      filter.$or = [
        { searchTitle: { $regex: searchLower, $options: 'i' } }, // Indexed field
        { title: { $regex: search, $options: 'i' } }, // Fallback to original
        { searchLyrics: { $regex: searchLower, $options: 'i' } }, // Indexed field (lowercase lyrics)
        { verses: { $regex: search, $options: 'i' } }, // Fallback to original verses
      ];
    }

    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [songs, total] = await Promise.all([
      this.songModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .populate('tags', 'name')
        .lean()
        .exec(),
      this.songModel.countDocuments(filter),
    ]);

    // Transform to match expected format
    const transformedSongs = songs.map((song: any) => ({
      id: song._id.toString(),
      title: song.title,
      number: song.number,
      language: song.language,
      chorus: song.chorus,
      verses: song.verses || '', // Verses is now a single string
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
      createdAt: song.createdAt,
      updatedAt: song.updatedAt,
    }));

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
      .populate('tags', 'name')
      .lean()
      .exec();

    if (!song) {
      throw new NotFoundException(`Song with ID ${id} not found`);
    }

    // Transform to match expected format
    return {
      id: song._id.toString(),
      title: song.title,
      number: song.number,
      language: song.language,
      chorus: song.chorus,
      verses: song.verses || '', // Verses is now a single string
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
      createdAt: (song as any).createdAt || new Date(),
      updatedAt: (song as any).updatedAt || new Date(),
    };
  }

  async update(id: string, updateSongDto: UpdateSongDto, userId?: string, username?: string, discordId?: string, ipAddress?: string, userAgent?: string) {
    const { verses, tags, ...songData } = updateSongDto;

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

    // Handle verses - now a single string field
    // Also regenerate search_lyrics when verses change
    if (verses !== undefined) {
      updateData.verses = verses;
      updateData.searchLyrics = verses.toLowerCase().trim();
    }

    // Handle tags
    if (tags) {
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

    // Track changes for audit log
    const changes: Record<string, any> = {};
    
    // Check each field in updateData
    Object.keys(updateData).forEach((key) => {
      // Skip internal fields
      if (key === 'searchTitle' || key === 'searchLyrics') {
        return;
      }
      
      const oldValue = (existing as any)[key];
      const newValue = updateData[key];
      
      // Compare values (handle arrays and objects)
      let hasChanged = false;
      if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);
      } else if (typeof oldValue === 'object' && typeof newValue === 'object' && oldValue !== null && newValue !== null) {
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
      const oldTagNames = oldTags && oldTags.length > 0
        ? oldTags.map((tag: any) => (tag.name || tag.toString())).sort().join(', ')
        : '';
      
      // Get new tag names (they're already names in the DTO)
      const newTagNames = tags.length > 0 ? tags.sort().join(', ') : '';
      
      if (oldTagNames !== newTagNames) {
        changes.tags = {
          old: oldTagNames || '(brak)',
          new: newTagNames || '(brak)',
        };
      }
    }

    // Update song
    await this.songModel.updateOne({ _id: id }, updateData);

    // Increment version when song is updated
    await this.songsVersionService.incrementVersion().catch(err => 
      console.error('Failed to increment songs version:', err)
    );

    // Log audit trail if user is authenticated
    if (userId && username) {
      await this.auditLogService.log(
        AuditLogAction.SONG_EDIT,
        userId,
        username,
        {
          discordId,
          songId: id,
          songTitle: updateData.title || existing.title,
          metadata: Object.keys(changes).length > 0 ? changes : undefined,
          ipAddress,
          userAgent,
        },
      ).catch(err => console.error('Failed to log audit trail:', err));
    }

    return this.findOne(id);
  }

  async remove(id: string, userId?: string, username?: string, discordId?: string, ipAddress?: string, userAgent?: string): Promise<void> {
    // Get song before deletion for audit log
    const song = await this.songModel.findOne({ _id: id, deletedAt: null });
    
    if (!song) {
      throw new NotFoundException(`Song with ID ${id} not found`);
    }

    // Soft delete
    await this.songModel.updateOne(
      { _id: id },
      { deletedAt: new Date() },
    );

    // Increment version when song is deleted
    await this.songsVersionService.incrementVersion().catch(err => 
      console.error('Failed to increment songs version:', err)
    );

    // Log audit trail if user is authenticated
    if (userId && username) {
      await this.auditLogService.log(
        AuditLogAction.SONG_DELETE,
        userId,
        username,
        {
          discordId,
          songId: id,
          songTitle: song.title,
          ipAddress,
          userAgent,
        },
      ).catch(err => console.error('Failed to log audit trail:', err));
    }
  }

  /**
   * Get all songs list (lightweight, for caching) - only metadata, no full content
   */
  async findAllForCache() {
    const songs = await this.songModel
      .find({ deletedAt: null })
      .select('title number language tags searchTitle searchLyrics chorus verses')
      .populate('tags', 'name')
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
      chorus: song.chorus ?? null,
      verses: song.verses ?? null,
      searchTitle: song.searchTitle,
      searchLyrics: song.searchLyrics,
    }));

    return transformedSongs;
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
      chorus: song.chorus || null,
      verses: typeof song.verses === 'string' ? song.verses : (song.verses || ''),
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
}
