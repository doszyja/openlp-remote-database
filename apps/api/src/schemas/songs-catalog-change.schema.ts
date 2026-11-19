import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SongsCatalogChangeDocument = HydratedDocument<SongsCatalogChange>;

export type SongsCatalogChangeAction = 'create' | 'update' | 'delete';

/**
 * One row per catalog version bump — enables OpenLP incremental pull since a stored version.
 */
@Schema({ collection: 'songs_catalog_changes' })
export class SongsCatalogChange {
  @Prop({ required: true })
  catalogVersion: number;

  @Prop({ required: true, index: true })
  songId: string;

  @Prop({ required: true, enum: ['create', 'update', 'delete'] })
  action: SongsCatalogChangeAction;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const SongsCatalogChangeSchema =
  SchemaFactory.createForClass(SongsCatalogChange);

SongsCatalogChangeSchema.index({ catalogVersion: 1 });
SongsCatalogChangeSchema.index({ songId: 1, catalogVersion: 1 });