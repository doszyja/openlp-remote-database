import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServicePlanService } from './service-plan.service';
import { ServicePlanController } from './service-plan.controller';
import { ServicePlan, ServicePlanSchema } from '../schemas/service-plan.schema';
import { Song, SongSchema } from '../schemas/song.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServicePlan.name, schema: ServicePlanSchema },
      { name: Song.name, schema: SongSchema },
    ]),
  ],
  controllers: [ServicePlanController],
  providers: [ServicePlanService],
  exports: [ServicePlanService],
})
export class ServicePlanModule {}

