import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SongbookDocument = HydratedDocument<Songbook>;

@Schema({ timestamps: true })
export class Songbook {
  @Prop({ required: true, unique: true, index: true })
  slug: string; // e.g., 'pielgrzym', 'zielony', 'wedrowiec', 'zborowe'

  @Prop({ required: true })
  name: string; // Display name, e.g., 'Pielgrzym', 'Zielony (Nowego Życia)', 'Zborowe'

  @Prop()
  description?: string;

  @Prop({ default: 0 })
  order: number; // For sorting in UI

  @Prop({ default: '#666666' })
  color?: string; // Optional color for UI chips
}

export const SongbookSchema = SchemaFactory.createForClass(Songbook);
