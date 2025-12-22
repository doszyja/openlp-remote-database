import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true })
  discordId: string;

  @Prop({ required: true })
  username: string;

  @Prop()
  discriminator?: string;

  @Prop()
  avatar?: string;

  @Prop({ type: [String], default: [] })
  discordRoles?: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
