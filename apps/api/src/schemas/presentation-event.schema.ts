import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PresentationEventDocument = HydratedDocument<PresentationEvent>;

export type SongViewSource = 'openlp' | 'browser';

@Schema({ timestamps: true })
export class PresentationEvent {
  @Prop({ required: true, enum: ['openlp', 'browser'], default: 'openlp', index: true })
  source: SongViewSource;

  @Prop({ index: true })
  clientId?: string;

  @Prop({ index: true })
  openlpSongId?: number;

  @Prop({ type: String, ref: 'Song', index: true })
  mongoSongId?: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  serviceItemTitle?: string;

  @Prop({ required: true, index: true })
  presentedAt: Date;

  @Prop({ type: String, ref: 'User', index: true })
  viewerUserId?: string;

  @Prop()
  viewerUsername?: string;

  @Prop()
  viewerDiscordId?: string;

  @Prop({ index: true })
  sessionId?: string;

  @Prop()
  pagePath?: string;

  @Prop({ index: true })
  viewContext?: string;

  @Prop({ index: true })
  deviceType?: string;

  @Prop()
  browserName?: string;

  @Prop()
  osName?: string;

  @Prop()
  screenWidth?: number;

  @Prop()
  screenHeight?: number;

  @Prop()
  language?: string;

  @Prop()
  timezone?: string;

  @Prop()
  referrer?: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;
}

export const PresentationEventSchema =
  SchemaFactory.createForClass(PresentationEvent);
PresentationEventSchema.index({ presentedAt: -1, clientId: 1 });
PresentationEventSchema.index({ presentedAt: -1, source: 1 });
PresentationEventSchema.index({ presentedAt: -1, deviceType: 1 });