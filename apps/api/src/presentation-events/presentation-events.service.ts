import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PresentationEvent,
  PresentationEventDocument,
  SongViewSource,
} from '../schemas/presentation-event.schema';
import { CreatePresentationEventDto } from './dto/create-presentation-event.dto';
import { CreateBrowserSongViewDto } from './dto/create-browser-song-view.dto';
import {
  QueryPresentationEventsDto,
  QueryPresentationSummaryDto,
} from './dto/query-presentation-events.dto';
import { parseUserAgent } from './utils/client-environment';

type ViewerIdentity = {
  viewerUserId?: string;
  viewerUsername?: string;
  viewerDiscordId?: string;
};

@Injectable()
export class PresentationEventsService {
  constructor(
    @InjectModel(PresentationEvent.name)
    private presentationEventModel: Model<PresentationEventDocument>,
  ) {}

  private mapRow(row: PresentationEvent & { _id: unknown }) {
    return {
      id: String(row._id),
      source: (row.source || 'openlp') as SongViewSource,
      clientId: row.clientId,
      openlpSongId: row.openlpSongId,
      mongoSongId: row.mongoSongId,
      title: row.title,
      serviceItemTitle: row.serviceItemTitle,
      presentedAt:
        row.presentedAt instanceof Date
          ? row.presentedAt.toISOString()
          : new Date(row.presentedAt).toISOString(),
      viewerUserId: row.viewerUserId,
      viewerUsername: row.viewerUsername,
      viewerDiscordId: row.viewerDiscordId,
      sessionId: row.sessionId,
      pagePath: row.pagePath,
      viewContext: row.viewContext,
      deviceType: row.deviceType,
      browserName: row.browserName,
      osName: row.osName,
      screenWidth: row.screenWidth,
      screenHeight: row.screenHeight,
      language: row.language,
      timezone: row.timezone,
      referrer: row.referrer,
      metadata: row.metadata,
    };
  }

  private buildFilter(query: {
    clientId?: string;
    mongoSongId?: string;
    title?: string;
    source?: SongViewSource;
    deviceType?: string;
    viewContext?: string;
    authenticated?: boolean;
    from?: string;
    to?: string;
    presentedAtGte?: Date;
  }) {
    const filter: Record<string, unknown> = {};

    if (query.clientId) filter.clientId = query.clientId;
    if (query.mongoSongId) filter.mongoSongId = query.mongoSongId;
    if (query.title?.trim()) {
      filter.title = { $regex: query.title.trim(), $options: 'i' };
    }
    if (query.source) filter.source = query.source;
    if (query.deviceType) filter.deviceType = query.deviceType;
    if (query.viewContext) filter.viewContext = query.viewContext;
    if (query.authenticated === true) {
      filter.viewerUserId = { $exists: true, $ne: null };
    } else if (query.authenticated === false) {
      filter.$or = [
        { viewerUserId: { $exists: false } },
        { viewerUserId: null },
        { viewerUserId: '' },
      ];
    }

    const from = query.from || query.presentedAtGte;
    if (from || query.to) {
      filter.presentedAt = {};
      if (from) {
        (filter.presentedAt as Record<string, Date>).$gte = new Date(from);
      }
      if (query.to) {
        (filter.presentedAt as Record<string, Date>).$lte = new Date(query.to);
      }
    }

    return filter;
  }

  async create(dto: CreatePresentationEventDto) {
    const event = await this.presentationEventModel.create({
      source: 'openlp',
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
      source: 'openlp' as const,
      ...dto,
      presentedAt: event.presentedAt.toISOString(),
    };
  }

  async createBrowserView(
    dto: CreateBrowserSongViewDto,
    options: {
      userAgent?: string;
      viewer?: ViewerIdentity | null;
    },
  ) {
    const env = parseUserAgent(options.userAgent);

    const event = await this.presentationEventModel.create({
      source: 'browser',
      mongoSongId: dto.mongoSongId,
      title: dto.title,
      presentedAt: new Date(),
      sessionId: dto.sessionId,
      pagePath: dto.pagePath,
      viewContext: dto.viewContext,
      screenWidth: dto.screenWidth,
      screenHeight: dto.screenHeight,
      language: dto.language,
      timezone: dto.timezone,
      referrer: dto.referrer?.slice(0, 512),
      userAgent: options.userAgent?.slice(0, 512),
      deviceType: env.deviceType,
      browserName: env.browserName,
      osName: env.osName,
      viewerUserId: options.viewer?.viewerUserId,
      viewerUsername: options.viewer?.viewerUsername,
      viewerDiscordId: options.viewer?.viewerDiscordId,
      metadata: {},
    });

    return this.mapRow(event.toObject());
  }

  async findAll(query: QueryPresentationEventsDto) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const skip = (page - 1) * limit;

    const filter = this.buildFilter({
      clientId: query.clientId,
      mongoSongId: query.mongoSongId,
      title: query.title,
      source: query.source,
      deviceType: query.deviceType,
      viewContext: query.viewContext,
      authenticated:
        query.authenticated === 'true'
          ? true
          : query.authenticated === 'false'
            ? false
            : undefined,
      from: query.from,
      to: query.to,
    });

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
      data: data.map((row) =>
        this.mapRow(row as PresentationEvent & { _id: unknown }),
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getSummary(query: QueryPresentationSummaryDto) {
    const days = Math.min(Math.max(query.days ?? 30, 1), 365);
    const from = new Date();
    from.setDate(from.getDate() - days);

    const match = this.buildFilter({
      clientId: query.clientId,
      source: query.source,
      deviceType: query.deviceType,
      presentedAtGte: from,
    });

    const [bySong, byDay, bySource, byDevice, authCounts, totalEvents] =
      await Promise.all([
        this.presentationEventModel.aggregate([
          { $match: match },
          {
            $group: {
              _id: { title: '$title', mongoSongId: '$mongoSongId' },
              count: { $sum: 1 },
              lastPresentedAt: { $max: '$presentedAt' },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 50 },
        ]),
        this.presentationEventModel.aggregate([
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
        ]),
        this.presentationEventModel.aggregate([
          { $match: match },
          {
            $group: {
              _id: { $ifNull: ['$source', 'openlp'] },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ]),
        this.presentationEventModel.aggregate([
          { $match: match },
          {
            $group: {
              _id: { $ifNull: ['$deviceType', 'unknown'] },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ]),
        this.presentationEventModel.aggregate([
          { $match: match },
          {
            $group: {
              _id: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$viewerUserId', null] },
                      { $ne: ['$viewerUserId', ''] },
                    ],
                  },
                  'authenticated',
                  'anonymous',
                ],
              },
              count: { $sum: 1 },
            },
          },
        ]),
        this.presentationEventModel.countDocuments(match).exec(),
      ]);

    const authenticatedViews =
      authCounts.find((row) => row._id === 'authenticated')?.count ?? 0;
    const anonymousViews =
      authCounts.find((row) => row._id === 'anonymous')?.count ?? 0;

    let grouped:
      | Array<{ key: string; label: string; count: number }>
      | undefined;
    if (query.groupBy === 'source') {
      grouped = bySource.map((row) => ({
        key: row._id,
        label: row._id === 'browser' ? 'Przeglądarka' : 'OpenLP',
        count: row.count,
      }));
    } else if (query.groupBy === 'device') {
      grouped = byDevice.map((row) => ({
        key: row._id,
        label: row._id,
        count: row.count,
      }));
    } else if (query.groupBy === 'day') {
      grouped = byDay.map((row) => ({
        key: row._id,
        label: row._id,
        count: row.count,
      }));
    } else if (query.groupBy === 'song') {
      grouped = bySong.map((row) => ({
        key: row._id.mongoSongId || row._id.title,
        label: row._id.title,
        count: row.count,
      }));
    }

    return {
      from: from.toISOString(),
      to: new Date().toISOString(),
      clientId: query.clientId ?? null,
      source: query.source ?? null,
      deviceType: query.deviceType ?? null,
      totalEvents,
      authenticatedViews,
      anonymousViews,
      bySong: bySong.map((row) => ({
        title: row._id.title,
        mongoSongId: row._id.mongoSongId,
        count: row.count,
        lastPresentedAt: row.lastPresentedAt,
      })),
      byDay: byDay.map((row) => ({ date: row._id, count: row.count })),
      bySource: bySource.map((row) => ({
        source: row._id as SongViewSource,
        count: row.count,
      })),
      byDevice: byDevice.map((row) => ({
        deviceType: row._id as string,
        count: row.count,
      })),
      grouped,
    };
  }
}
