import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ServicePlanDocument = HydratedDocument<ServicePlan>;

@Schema({ _id: true })
export class ServicePlanItem {
  @Prop({ required: true })
  songId: string;

  @Prop({ required: true })
  songTitle: string;

  @Prop({ required: true, default: 0 })
  order: number;

  @Prop()
  notes?: string;

  @Prop({ default: false })
  isActive?: boolean;

  @Prop({ default: 0 })
  activeVerseIndex?: number;
}

@Schema({ timestamps: true })
export class ServicePlan {
  @Prop({ required: true })
  name: string;

  @Prop()
  date?: string;

  @Prop({ type: [ServicePlanItem], default: [] })
  items: ServicePlanItem[];
}

export const ServicePlanSchema = SchemaFactory.createForClass(ServicePlan);
ServicePlanSchema.index({ date: 1 });
ServicePlanSchema.index({ createdAt: -1 });
