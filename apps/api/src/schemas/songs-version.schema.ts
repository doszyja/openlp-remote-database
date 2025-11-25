import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SongsVersionDocument = HydratedDocument<SongsVersion>;

/**
 * Schema to track version of songs collection
 * Version increments whenever a song is created or deleted
 */
@Schema({ collection: 'songs_version' })
export class SongsVersion {
  @Prop({ required: true, default: 0 })
  version: number;

  @Prop({ type: Date, default: Date.now })
  lastUpdated: Date;
}

export const SongsVersionSchema = SchemaFactory.createForClass(SongsVersion);

// Ensure only one document exists
SongsVersionSchema.index({ version: 1 }, { unique: false });

