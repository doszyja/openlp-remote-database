import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SongService } from './song.service';
import { SongController } from './song.controller';
import { SongsVersionService } from './songs-version.service';
import { Song, SongSchema } from '../schemas/song.schema';
import { Tag, TagSchema } from '../schemas/tag.schema';
import { SongsVersion, SongsVersionSchema } from '../schemas/songs-version.schema';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Song.name, schema: SongSchema },
      { name: Tag.name, schema: TagSchema },
      { name: SongsVersion.name, schema: SongsVersionSchema },
    ]),
    AuditLogModule,
  ],
  controllers: [SongController],
  providers: [SongService, SongsVersionService],
  exports: [SongService],
})
export class SongModule {}
