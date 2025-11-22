import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SongDocument = HydratedDocument<Song>;

@Schema({ _id: false })
export class Verse {
  @Prop({ required: true })
  order: number;

  @Prop({ required: true })
  content: string;

  @Prop()
  label?: string;
}

@Schema({ _id: false })
export class OpenLPMapping {
  @Prop()
  openlpId?: number;

  @Prop({ type: Date })
  lastSyncedAt?: Date;

  @Prop({ type: Object })
  syncMetadata?: Record<string, any>;
}

@Schema({ timestamps: true })
export class Song {
  @Prop({ required: true, index: true })
  title: string;

  @Prop()
  number?: string;

  @Prop({ default: 'en', index: true })
  language: string;

  @Prop()
  chorus?: string;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;

  @Prop({ type: [{ type: Object }] })
  verses: Verse[];

  @Prop({ type: [{ type: String, ref: 'Tag' }] })
  tags: string[];

  @Prop({ type: Object, default: null })
  openlpMapping?: OpenLPMapping | null;
}

export const SongSchema = SchemaFactory.createForClass(Song);
SongSchema.index({ deletedAt: 1 });

