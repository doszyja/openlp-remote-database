import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PresentationEvent,
  PresentationEventSchema,
} from '../schemas/presentation-event.schema';
import { PresentationEventsController } from './presentation-events.controller';
import { PresentationEventsService } from './presentation-events.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PresentationEvent.name, schema: PresentationEventSchema },
    ]),
  ],
  controllers: [PresentationEventsController],
  providers: [PresentationEventsService],
  exports: [PresentationEventsService],
})
export class PresentationEventsModule {}