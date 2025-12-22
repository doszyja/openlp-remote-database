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

@Schema({ _id: false })
export class Verse {
  @Prop({ required: true })
  order: number; // verse_order from OpenLP - critical for preserving verse sequence

  @Prop({ required: true })
  content: string; // Verse text content

  @Prop()
  label?: string; // Optional label (e.g., "Verse 1", "Bridge", "Pre-Chorus")

  @Prop()
  originalLabel?: string; // Original identifier from XML/verse_order (e.g., "v1", "c1", "b1") - used to match verseOrder string
}

@Schema({ timestamps: true })
export class Song {
  @Prop({ required: true, index: true })
  title: string;

  @Prop()
  number?: string; // Maps to OpenLP alternate_title or ccli_number

  @Prop({ default: 'en', index: true })
  language: string;

  @Prop({ required: true, type: [Verse] })
  verses: Verse[]; // Array of verses with order preserved (includes chorus, bridge, etc. as verse objects with type labels)

  @Prop({ type: String })
  verseOrder?: string; // verse_order string from OpenLP SQLite (e.g., "v1 c1 v2 c1 v3 c1 v4 c1 v5 c1") - 1:1 transparent with SQLite structure

  @Prop({ type: String })
  lyricsXml?: string; // Exact XML from SQLite lyrics column - 1:1 transparent with SQLite (preserves CDATA, type/label attributes, etc.)

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

