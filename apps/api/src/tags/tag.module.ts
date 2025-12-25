import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TagService } from './tag.service';
import { TagController } from './tag.controller';
import { Tag, TagSchema } from '../schemas/tag.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Tag.name, schema: TagSchema }])],
  controllers: [TagController],
  providers: [TagService],
  exports: [TagService],
})
export class TagModule {}
