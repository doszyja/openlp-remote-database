import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SongVersionDocument = HydratedDocument<SongVersion>;

/**
 * Schema to store version history of songs
 * Each time a song is updated, a new version is created
 */
@Schema({ timestamps: true })
export class SongVersion {
  @Prop({ required: true, index: true })
  songId: string; // Reference to the song

  @Prop({ required: true })
  version: number; // Version number (1, 2, 3, ...)

  @Prop({ required: true, type: Object })
  songData: {
    title: string;
    number?: string;
    language: string;
    verses: Array<{
      order: number;
      content: string;
      label?: string;
      originalLabel?: string;
    }>;
    verseOrder?: string;
    lyricsXml?: string;
    tags: string[];
    copyright?: string;
    comments?: string;
    ccliNumber?: string;
    searchTitle?: string;
    searchLyrics?: string;
    openlpMapping?: {
      openlpId?: number;
      lastSyncedAt?: Date;
      syncMetadata?: Record<string, any>;
    };
  }; // Full song data at this version

  @Prop()
  changedBy?: string; // User ID who made the change

  @Prop()
  changedByUsername?: string; // Username for display

  @Prop()
  changedByDiscordId?: string; // Discord ID

  @Prop()
  changeReason?: string; // Optional reason for the change

  @Prop({ type: Object })
  changes?: Record<string, { old: any; new: any }>; // What fields changed

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const SongVersionSchema = SchemaFactory.createForClass(SongVersion);
SongVersionSchema.index({ songId: 1, version: -1 }); // For efficient querying
SongVersionSchema.index({ songId: 1, createdAt: -1 }); // For chronological queries
