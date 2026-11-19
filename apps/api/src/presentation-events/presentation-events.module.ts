import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PresentationEvent,
  PresentationEventSchema,
} from '../schemas/presentation-event.schema';
import { PresentationEventsController } from './presentation-events.controller';
import { PresentationEventsService } from './presentation-events.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PresentationEvent.name, schema: PresentationEventSchema },
    ]),
    AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
  ],
  controllers: [PresentationEventsController],
  providers: [PresentationEventsService],
  exports: [PresentationEventsService],
})
export class PresentationEventsModule {}
