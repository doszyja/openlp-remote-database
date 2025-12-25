import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SongVersion,
  SongVersionDocument,
} from '../schemas/song-version.schema';
import { Song, SongDocument } from '../schemas/song.schema';

@Injectable()
export class SongVersionService {
  constructor(
    @InjectModel(SongVersion.name)
    private versionModel: Model<SongVersionDocument>,
    @InjectModel(Song.name) private songModel: Model<SongDocument>,
  ) {}

  /**
   * Create a new version of a song
   */
  async createVersion(
    songId: string,
    songData: any,
    changedBy?: string,
    changedByUsername?: string,
    changedByDiscordId?: string,
    changeReason?: string,
    changes?: Record<string, { old: any; new: any }>,
  ): Promise<SongVersionDocument> {
    // Get current max version for this song
    const maxVersion = await this.versionModel
      .findOne({ songId })
      .sort({ version: -1 })
      .exec();

    const nextVersion = maxVersion ? maxVersion.version + 1 : 1;

    // Create version document
    const version = await this.versionModel.create({
      songId,
      version: nextVersion,
      songData: {
        title: songData.title,
        number: songData.number,
        language: songData.language,
        verses: songData.verses || [],
        verseOrder: songData.verseOrder,
        lyricsXml: songData.lyricsXml,
        tags: songData.tags || [],
        copyright: songData.copyright,
        comments: songData.comments,
        ccliNumber: songData.ccliNumber,
        searchTitle: songData.searchTitle,
        searchLyrics: songData.searchLyrics,
        openlpMapping: songData.openlpMapping,
      },
      changedBy,
      changedByUsername,
      changedByDiscordId,
      changeReason,
      changes,
    });

    return version;
  }

  /**
   * Get all versions of a song
   */
  async getVersions(songId: string): Promise<SongVersionDocument[]> {
    return this.versionModel.find({ songId }).sort({ version: -1 }).exec();
  }

  /**
   * Get a specific version of a song
   */
  async getVersion(
    songId: string,
    version: number,
  ): Promise<SongVersionDocument | null> {
    return this.versionModel.findOne({ songId, version }).exec();
  }

  /**
   * Restore a song to a specific version
   */
  async restoreVersion(
    songId: string,
    version: number,
    restoredBy?: string,
    restoredByUsername?: string,
    restoredByDiscordId?: string,
  ): Promise<SongDocument> {
    // Get the version to restore
    const versionDoc = await this.getVersion(songId, version);
    if (!versionDoc) {
      throw new NotFoundException(
        `Version ${version} not found for song ${songId}`,
      );
    }

    // Get current song
    const currentSong = await this.songModel.findById(songId).exec();
    if (!currentSong) {
      throw new NotFoundException(`Song ${songId} not found`);
    }

    // Restore song data from version
    const versionData = versionDoc.songData;
    currentSong.title = versionData.title;
    currentSong.number = versionData.number;
    currentSong.language = versionData.language;
    currentSong.verses = versionData.verses;
    currentSong.verseOrder = versionData.verseOrder;
    currentSong.lyricsXml = versionData.lyricsXml;
    currentSong.tags = versionData.tags;
    currentSong.copyright = versionData.copyright;
    currentSong.comments = versionData.comments;
    currentSong.ccliNumber = versionData.ccliNumber;
    currentSong.searchTitle = versionData.searchTitle;
    currentSong.searchLyrics = versionData.searchLyrics;
    currentSong.openlpMapping = versionData.openlpMapping;

    await currentSong.save();

    // Create a new version for the restoration (so we have history of the restore)
    await this.createVersion(
      songId,
      currentSong.toObject(),
      restoredBy,
      restoredByUsername,
      restoredByDiscordId,
      `Restored from version ${version}`,
    );

    return currentSong;
  }

  /**
   * Compare two versions of a song
   */
  async compareVersions(
    songId: string,
    version1: number,
    version2: number,
  ): Promise<{
    version1: SongVersionDocument;
    version2: SongVersionDocument;
    differences: Record<string, { old: any; new: any }>;
  }> {
    const v1 = await this.getVersion(songId, version1);
    const v2 = await this.getVersion(songId, version2);

    if (!v1 || !v2) {
      throw new NotFoundException('One or both versions not found');
    }

    const differences: Record<string, { old: any; new: any }> = {};
    const data1 = v1.songData;
    const data2 = v2.songData;

    // Compare all fields
    const fieldsToCompare = [
      'title',
      'number',
      'language',
      'verseOrder',
      'lyricsXml',
      'copyright',
      'comments',
      'ccliNumber',
    ];

    for (const field of fieldsToCompare) {
      const val1 = (data1 as any)[field];
      const val2 = (data2 as any)[field];
      if (val1 !== val2) {
        differences[field] = { old: val1, new: val2 };
      }
    }

    // Compare verses
    if (JSON.stringify(data1.verses) !== JSON.stringify(data2.verses)) {
      differences.verses = { old: data1.verses, new: data2.verses };
    }

    // Compare tags
    if (JSON.stringify(data1.tags) !== JSON.stringify(data2.tags)) {
      differences.tags = { old: data1.tags, new: data2.tags };
    }

    return {
      version1: v1,
      version2: v2,
      differences,
    };
  }

  /**
   * Get latest version number for a song
   */
  async getLatestVersion(songId: string): Promise<number> {
    const latest = await this.versionModel
      .findOne({ songId })
      .sort({ version: -1 })
      .exec();
    return latest ? latest.version : 0;
  }
}
