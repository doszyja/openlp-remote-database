import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SongService } from './song.service';
import { SongController } from './song.controller';
import { Song, SongSchema } from '../schemas/song.schema';
import { Tag, TagSchema } from '../schemas/tag.schema';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Song.name, schema: SongSchema },
      { name: Tag.name, schema: TagSchema },
    ]),
    AuditLogModule,
  ],
  controllers: [SongController],
  providers: [SongService],
  exports: [SongService],
})
export class SongModule {}
