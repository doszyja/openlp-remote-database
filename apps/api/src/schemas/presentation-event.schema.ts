import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PresentationEventDocument = HydratedDocument<PresentationEvent>;

@Schema({ timestamps: true })
export class PresentationEvent {
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

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;
}

export const PresentationEventSchema =
  SchemaFactory.createForClass(PresentationEvent);
PresentationEventSchema.index({ presentedAt: -1, clientId: 1 });