import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Song, SongDocument } from '../schemas/song.schema';
import { Tag, TagDocument } from '../schemas/tag.schema';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { QuerySongDto } from './dto/query-song.dto';

@Injectable()
export class SongService {
  constructor(
    @InjectModel(Song.name) private songModel: Model<SongDocument>,
    @InjectModel(Tag.name) private tagModel: Model<TagDocument>,
  ) {}

  async create(createSongDto: CreateSongDto) {
    const { verses, tags, ...songData } = createSongDto;

    // Ensure verses have order
    const versesWithOrder = verses.map((verse, index) => ({
      order: verse.order ?? index + 1,
      content: verse.content,
      label: verse.label || null,
    }));

    // Create or get tags
    const tagIds: string[] = [];
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        let tag = await this.tagModel.findOne({ name: tagName });
        if (!tag) {
          tag = await this.tagModel.create({ name: tagName });
        }
        tagIds.push(tag._id.toString());
      }
    }

    // Create song
    const song = await this.songModel.create({
      ...songData,
      language: songData.language || 'en',
      verses: versesWithOrder,
      tags: tagIds,
    });

    return this.findOne(song._id.toString());
  }

  async findAll(query: QuerySongDto) {
    const { page = 1, limit = 20, language, tags, search, sortBy = 'title', sortOrder = 'asc' } = query;
    const skip = (page - 1) * limit;

    const filter: any = {
      deletedAt: null,
    };

    if (language) {
      filter.language = language;
    }

    if (tags && tags.length > 0) {
      // Find tag IDs by names
      const tagDocs = await this.tagModel.find({ name: { $in: tags } });
      const tagIds = tagDocs.map((t) => t._id.toString());
      filter.tags = { $in: tagIds };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'verses.content': { $regex: search, $options: 'i' } },
      ];
    }

    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [songs, total] = await Promise.all([
      this.songModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .populate('tags', 'name')
        .lean()
        .exec(),
      this.songModel.countDocuments(filter),
    ]);

    // Transform to match expected format
    const transformedSongs = songs.map((song: any) => ({
      id: song._id.toString(),
      title: song.title,
      number: song.number,
      language: song.language,
      chorus: song.chorus,
      verses: song.verses.sort((a: any, b: any) => a.order - b.order),
      tags: song.tags.map((tag: any) => ({
        id: tag._id.toString(),
        name: tag.name,
      })),
      openlpMapping: song.openlpMapping,
      createdAt: song.createdAt,
      updatedAt: song.updatedAt,
    }));

    return {
      data: transformedSongs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const song = await this.songModel
      .findOne({ _id: id, deletedAt: null })
      .populate('tags', 'name')
      .lean()
      .exec();

    if (!song) {
      throw new NotFoundException(`Song with ID ${id} not found`);
    }

    // Transform to match expected format
    return {
      id: song._id.toString(),
      title: song.title,
      number: song.number,
      language: song.language,
      chorus: song.chorus,
      verses: song.verses.sort((a: any, b: any) => a.order - b.order),
      tags: song.tags.map((tag: any) => ({
        id: tag._id.toString(),
        name: tag.name,
      })),
      openlpMapping: song.openlpMapping,
      createdAt: (song as any).createdAt || new Date(),
      updatedAt: (song as any).updatedAt || new Date(),
    };
  }

  async update(id: string, updateSongDto: UpdateSongDto) {
    const { verses, tags, ...songData } = updateSongDto;

    // Check if song exists
    const existing = await this.songModel.findOne({ _id: id, deletedAt: null });
    if (!existing) {
      throw new NotFoundException(`Song with ID ${id} not found`);
    }

    const updateData: any = { ...songData };

    // Handle verses
    if (verses) {
      const versesWithOrder = verses.map((verse, index) => ({
        order: verse.order ?? index + 1,
        content: verse.content,
        label: verse.label || null,
      }));
      updateData.verses = versesWithOrder;
    }

    // Handle tags
    if (tags) {
      const tagIds: string[] = [];
      for (const tagName of tags) {
        let tag = await this.tagModel.findOne({ name: tagName });
        if (!tag) {
          tag = await this.tagModel.create({ name: tagName });
        }
        tagIds.push(tag._id.toString());
      }
      updateData.tags = tagIds;
    }

    // Update song
    await this.songModel.updateOne({ _id: id }, updateData);

    return this.findOne(id);
  }

  async remove(id: string) {
    // Soft delete
    const song = await this.songModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true },
    );

    if (!song) {
      throw new NotFoundException(`Song with ID ${id} not found`);
    }

    return { message: 'Song deleted successfully' };
  }
}
