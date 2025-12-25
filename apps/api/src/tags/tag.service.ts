import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tag, TagDocument } from '../schemas/tag.schema';

@Injectable()
export class TagService {
  constructor(@InjectModel(Tag.name) private tagModel: Model<TagDocument>) {}

  async findAll(parentId?: string | null): Promise<TagDocument[]> {
    const query: any = {};
    if (parentId === null || parentId === undefined) {
      // Get root level tags (no parent)
      query.parentId = { $in: [null, undefined] };
    } else {
      query.parentId = parentId;
    }
    return this.tagModel.find(query).sort({ order: 1, name: 1 }).exec();
  }

  async findOne(id: string): Promise<TagDocument> {
    const tag = await this.tagModel.findById(id).exec();
    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }
    return tag;
  }

  async create(tagData: {
    name: string;
    parentId?: string | null;
    color?: string;
    order?: number;
    isCategory?: boolean;
    description?: string;
  }): Promise<TagDocument> {
    // Check if parent exists if parentId is provided
    if (tagData.parentId) {
      const parent = await this.tagModel.findById(tagData.parentId).exec();
      if (!parent) {
        throw new NotFoundException(
          `Parent tag with ID ${tagData.parentId} not found`,
        );
      }
    }

    return this.tagModel.create(tagData);
  }

  async update(
    id: string,
    updateData: {
      name?: string;
      parentId?: string | null;
      color?: string;
      order?: number;
      isCategory?: boolean;
      description?: string;
    },
  ): Promise<TagDocument> {
    const tag = await this.tagModel.findById(id).exec();
    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    // Prevent circular references
    if (updateData.parentId === id) {
      throw new Error('Tag cannot be its own parent');
    }

    // Check if parent exists if parentId is provided
    if (updateData.parentId) {
      const parent = await this.tagModel.findById(updateData.parentId).exec();
      if (!parent) {
        throw new NotFoundException(
          `Parent tag with ID ${updateData.parentId} not found`,
        );
      }
    }

    Object.assign(tag, updateData);
    return tag.save();
  }

  async delete(id: string): Promise<void> {
    const tag = await this.tagModel.findById(id).exec();
    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    // Check if tag has children
    const children = await this.tagModel.find({ parentId: id }).exec();
    if (children.length > 0) {
      throw new Error(
        'Cannot delete tag with children. Delete or move children first.',
      );
    }

    await this.tagModel.findByIdAndDelete(id).exec();
  }

  async getHierarchy(): Promise<any[]> {
    const allTags = await this.tagModel
      .find()
      .sort({ order: 1, name: 1 })
      .exec();
    const tagMap = new Map<string, any>();

    // First pass: create map of all tags
    allTags.forEach((tag) => {
      tagMap.set(tag._id.toString(), {
        id: tag._id.toString(),
        name: tag.name,
        color: tag.color,
        order: tag.order || 0,
        isCategory: tag.isCategory || false,
        description: tag.description,
        parentId: tag.parentId || null,
        children: [],
      });
    });

    // Second pass: build hierarchy
    const rootTags: any[] = [];
    tagMap.forEach((tag) => {
      if (!tag.parentId) {
        rootTags.push(tag);
      } else {
        const parent = tagMap.get(tag.parentId);
        if (parent) {
          parent.children.push(tag);
        }
      }
    });

    return rootTags;
  }

  /**
   * Auto-tag song based on content analysis
   * This is a simple implementation - can be enhanced with ML/NLP
   */
  async suggestTags(songTitle: string, lyrics: string): Promise<string[]> {
    const suggestions: string[] = [];
    const content = `${songTitle} ${lyrics}`.toLowerCase();

    // Simple keyword-based tagging
    const keywordMap: Record<string, string[]> = {
      chwała: ['Chwała', 'Uwielbienie'],
      praise: ['Chwała', 'Uwielbienie'],
      glory: ['Chwała', 'Uwielbienie'],
      modlitwa: ['Modlitwa'],
      prayer: ['Modlitwa'],
      komunia: ['Komunia', 'Eucharystia'],
      communion: ['Komunia', 'Eucharystia'],
      eucharist: ['Komunia', 'Eucharystia'],
      adwent: ['Adwent'],
      advent: ['Adwent'],
      'boże narodzenie': ['Boże Narodzenie', 'Święta'],
      christmas: ['Boże Narodzenie', 'Święta'],
      wielkanoc: ['Wielkanoc', 'Święta'],
      easter: ['Wielkanoc', 'Święta'],
      pokuta: ['Pokuta', 'Nawrócenie'],
      repentance: ['Pokuta', 'Nawrócenie'],
      miłość: ['Miłość'],
      love: ['Miłość'],
      nadzieja: ['Nadzieja'],
      hope: ['Nadzieja'],
      wiara: ['Wiara'],
      faith: ['Wiara'],
    };

    for (const [keyword, tags] of Object.entries(keywordMap)) {
      if (content.includes(keyword)) {
        suggestions.push(...tags);
      }
    }

    // Remove duplicates
    return Array.from(new Set(suggestions));
  }
}
