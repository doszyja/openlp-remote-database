import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SongService } from './song.service';
import { SongController } from './song.controller';
import { SongsVersionService } from './songs-version.service';
import { SongVersionService } from './song-version.service';
import { Song, SongSchema } from '../schemas/song.schema';
import { Tag, TagSchema } from '../schemas/tag.schema';
import { Songbook, SongbookSchema } from '../schemas/songbook.schema';
import {
  SongsVersion,
  SongsVersionSchema,
} from '../schemas/songs-version.schema';
import { SongVersion, SongVersionSchema } from '../schemas/song-version.schema';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Song.name, schema: SongSchema },
      { name: Tag.name, schema: TagSchema },
      { name: Songbook.name, schema: SongbookSchema },
      { name: SongsVersion.name, schema: SongsVersionSchema },
      { name: SongVersion.name, schema: SongVersionSchema },
    ]),
    AuditLogModule,
  ],
  controllers: [SongController],
  providers: [SongService, SongsVersionService, SongVersionService],
  exports: [SongService, SongVersionService],
})
export class SongModule {}
