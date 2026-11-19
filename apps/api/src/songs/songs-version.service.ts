import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SongsVersion,
  SongsVersionDocument,
} from '../schemas/songs-version.schema';
import {
  SongsCatalogChange,
  SongsCatalogChangeAction,
  SongsCatalogChangeDocument,
} from '../schemas/songs-catalog-change.schema';

@Injectable()
export class SongsVersionService {
  constructor(
    @InjectModel(SongsVersion.name)
    private versionModel: Model<SongsVersionDocument>,
    @InjectModel(SongsCatalogChange.name)
    private changeModel: Model<SongsCatalogChangeDocument>,
  ) {}

  /**
   * Get current version of songs collection
   */
  async getVersion(): Promise<number> {
    const versionDoc = await this.versionModel.findOne().exec();
    if (!versionDoc) {
      const newVersion = await this.versionModel.create({
        version: 0,
        lastUpdated: new Date(),
      });
      return newVersion.version;
    }
    return versionDoc.version;
  }

  /**
   * Increment catalog version and optionally record which song changed (for incremental sync).
   */
  async incrementVersion(
    songId?: string,
    action?: SongsCatalogChangeAction,
  ): Promise<number> {
    const versionDoc = await this.versionModel.findOne().exec();
    let newVersion: number;
    if (!versionDoc) {
      const created = await this.versionModel.create({
        version: 1,
        lastUpdated: new Date(),
      });
      newVersion = created.version;
    } else {
      versionDoc.version += 1;
      versionDoc.lastUpdated = new Date();
      await versionDoc.save();
      newVersion = versionDoc.version;
    }

    if (songId && action) {
      await this.changeModel
        .create({
          catalogVersion: newVersion,
          songId,
          action,
        })
        .catch((err) =>
          console.error('Failed to log songs catalog change:', err),
        );
    }

    return newVersion;
  }

  /**
   * Raw change log entries with catalogVersion strictly greater than sinceVersion.
   */
  async getChangesSince(sinceVersion: number): Promise<SongsCatalogChange[]> {
    if (sinceVersion < 0) {
      return [];
    }
    return this.changeModel
      .find({ catalogVersion: { $gt: sinceVersion } })
      .sort({ catalogVersion: 1 })
      .lean()
      .exec();
  }
}
