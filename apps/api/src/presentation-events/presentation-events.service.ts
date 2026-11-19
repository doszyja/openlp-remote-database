import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PresentationEvent,
  PresentationEventDocument,
} from '../schemas/presentation-event.schema';
import { CreatePresentationEventDto } from './dto/create-presentation-event.dto';
import { QueryPresentationEventsDto } from './dto/query-presentation-events.dto';

@Injectable()
export class PresentationEventsService {
  constructor(
    @InjectModel(PresentationEvent.name)
    private presentationEventModel: Model<PresentationEventDocument>,
  ) {}

  async create(dto: CreatePresentationEventDto) {
    const event = await this.presentationEventModel.create({
      clientId: dto.clientId,
      openlpSongId: dto.openlpSongId,
      mongoSongId: dto.mongoSongId,
      title: dto.title,
      serviceItemTitle: dto.serviceItemTitle,
      presentedAt: dto.presentedAt ? new Date(dto.presentedAt) : new Date(),
      metadata: dto.metadata ?? {},
    });
    return {
      id: event._id.toString(),
      ...dto,
      presentedAt: event.presentedAt.toISOString(),
    };
  }

  async findAll(query: QueryPresentationEventsDto) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.clientId) {
      filter.clientId = query.clientId;
    }
    if (query.mongoSongId) {
      filter.mongoSongId = query.mongoSongId;
    }
    if (query.from || query.to) {
      filter.presentedAt = {};
      if (query.from) {
        (filter.presentedAt as Record<string, Date>).$gte = new Date(query.from);
      }
      if (query.to) {
        (filter.presentedAt as Record<string, Date>).$lte = new Date(query.to);
      }
    }

    const [data, total] = await Promise.all([
      this.presentationEventModel
        .find(filter)
        .sort({ presentedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.presentationEventModel.countDocuments(filter).exec(),
    ]);

    return {
      data: data.map((row) => ({
        id: row._id.toString(),
        clientId: row.clientId,
        openlpSongId: row.openlpSongId,
        mongoSongId: row.mongoSongId,
        title: row.title,
        serviceItemTitle: row.serviceItemTitle,
        presentedAt: row.presentedAt,
        metadata: row.metadata,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSummary(clientId?: string, days = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);

    const match: Record<string, unknown> = {
      presentedAt: { $gte: from },
    };
    if (clientId) {
      match.clientId = clientId;
    }

    const bySong = await this.presentationEventModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            title: '$title',
            mongoSongId: '$mongoSongId',
          },
          count: { $sum: 1 },
          lastPresentedAt: { $max: '$presentedAt' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);

    const byDay = await this.presentationEventModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$presentedAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      from: from.toISOString(),
      to: new Date().toISOString(),
      clientId: clientId ?? null,
      totalEvents: byDay.reduce((sum, row) => sum + row.count, 0),
      bySong: bySong.map((row) => ({
        title: row._id.title,
        mongoSongId: row._id.mongoSongId,
        count: row.count,
        lastPresentedAt: row.lastPresentedAt,
      })),
      byDay: byDay.map((row) => ({ date: row._id, count: row.count })),
    };
  }
}