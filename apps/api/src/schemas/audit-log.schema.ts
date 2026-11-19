import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

export enum AuditLogAction {
  LOGIN = 'LOGIN',
  SONG_EDIT = 'SONG_EDIT',
  SONG_EDIT_OPENLP = 'SONG_EDIT_OPENLP',
  SONG_CREATE = 'SONG_CREATE',
  SONG_CREATE_OPENLP = 'SONG_CREATE_OPENLP',
  SONG_DELETE = 'SONG_DELETE',
  SONG_RESTORE_VERSION = 'SONG_RESTORE_VERSION',
  ZIP_EXPORT = 'ZIP_EXPORT',
}

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true, enum: AuditLogAction, index: true })
  action: AuditLogAction;

  @Prop({ required: true, type: String, ref: 'User', index: true })
  userId: string;

  @Prop({ required: true })
  username: string;

  @Prop()
  discordId?: string;

  @Prop()
  avatar?: string;

  @Prop({ type: String, ref: 'Song' })
  songId?: string;

  @Prop()
  songTitle?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
