import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SongsVersion,
  SongsVersionDocument,
} from '../schemas/songs-version.schema';

@Injectable()
export class SongsVersionService {
  constructor(
    @InjectModel(SongsVersion.name)
    private versionModel: Model<SongsVersionDocument>,
  ) {}

  /**
   * Get current version of songs collection
   */
  async getVersion(): Promise<number> {
    const versionDoc = await this.versionModel.findOne().exec();
    if (!versionDoc) {
      // Initialize version if it doesn't exist
      const newVersion = await this.versionModel.create({
        version: 0,
        lastUpdated: new Date(),
      });
      return newVersion.version;
    }
    return versionDoc.version;
  }

  /**
   * Increment version (called when song is created or deleted)
   */
  async incrementVersion(): Promise<number> {
    const versionDoc = await this.versionModel.findOne().exec();
    if (!versionDoc) {
      const newVersion = await this.versionModel.create({
        version: 1,
        lastUpdated: new Date(),
      });
      return newVersion.version;
    }

    versionDoc.version += 1;
    versionDoc.lastUpdated = new Date();
    await versionDoc.save();
    return versionDoc.version;
  }
}
