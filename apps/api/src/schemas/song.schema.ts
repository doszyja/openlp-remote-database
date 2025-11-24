import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SongDocument = HydratedDocument<Song>;

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
  number?: string; // Maps to OpenLP alternate_title or ccli_number

  @Prop({ default: 'en', index: true })
  language: string;

  @Prop()
  chorus?: string;

  @Prop({ required: true, type: String })
  verses: string; // All verses stored as single string (can be split visually in frontend)

  @Prop({ type: [{ type: String, ref: 'Tag' }] })
  tags: string[]; // Maps to OpenLP theme_name

  // OpenLP compatibility fields
  @Prop()
  copyright?: string; // OpenLP copyright field

  @Prop()
  comments?: string; // OpenLP comments field (can store metadata)

  @Prop()
  ccliNumber?: string; // OpenLP ccli_number field (alternative to number)

  @Prop()
  searchTitle?: string; // OpenLP search_title (lowercase title for searching)

  @Prop()
  searchLyrics?: string; // OpenLP search_lyrics (lowercase lyrics for searching)

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;

  @Prop({ type: Object, default: null })
  openlpMapping?: OpenLPMapping | null;
}

export const SongSchema = SchemaFactory.createForClass(Song);
SongSchema.index({ deletedAt: 1 });
SongSchema.index({ searchTitle: 1 }); // For OpenLP-compatible searching
SongSchema.index({ searchLyrics: 1 }); // For OpenLP-compatible lyrics searching

