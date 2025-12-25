import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TagDocument = HydratedDocument<Tag>;

@Schema({ timestamps: true })
export class Tag {
  @Prop({ required: true, index: true })
  name: string;

  @Prop({ type: String, ref: 'Tag', default: null })
  parentId?: string | null; // Parent tag for hierarchical categories

  @Prop()
  color?: string; // Hex color code (e.g., "#FF5733")

  @Prop({ default: 0 })
  order?: number; // Order for sorting within same level

  @Prop({ default: false })
  isCategory?: boolean; // Whether this is a category (can have children) or a tag

  @Prop()
  description?: string; // Optional description
}

export const TagSchema = SchemaFactory.createForClass(Tag);
TagSchema.index({ parentId: 1 }); // For efficient parent-child queries
TagSchema.index({ name: 1, parentId: 1 }, { unique: true }); // Unique name within parent
