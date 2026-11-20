import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Song, SongSchema } from '../schemas/song.schema';
import { SpellcheckController } from './spellcheck.controller';
import { SpellcheckService } from './spellcheck.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Song.name, schema: SongSchema }]),
  ],
  controllers: [SpellcheckController],
  providers: [SpellcheckService],
})
export class SpellcheckModule {}