import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServicePlanService } from './service-plan.service';
import { ServicePlanController } from './service-plan.controller';
import { ServicePlan, ServicePlanSchema } from '../schemas/service-plan.schema';
import { Song, SongSchema } from '../schemas/song.schema';
import { ServicePlanGateway } from './service-plan.gateway';
import { WebSocketServerService } from './websocket-server.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServicePlan.name, schema: ServicePlanSchema },
      { name: Song.name, schema: SongSchema },
    ]),
  ],
  controllers: [ServicePlanController],
  providers: [
    ServicePlanService,
    WebSocketServerService,
    {
      provide: ServicePlanGateway,
      useFactory: (service: ServicePlanService) => {
        const gateway = new ServicePlanGateway(service);
        return gateway;
      },
      inject: [ServicePlanService],
    },
  ],
  exports: [ServicePlanService, ServicePlanGateway, WebSocketServerService],
})
export class ServicePlanModule {}
