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
import { AuthService } from '../auth/auth.service';

type ViewerIdentity = {
  viewerUserId?: string;
  viewerUsername?: string;
  viewerDiscordId?: string;
  viewerAvatar?: string | null;
};

type DiscordUserLookup = {
  id: string;
  username: string;
  discordId: string;
  avatar?: string | null;
};

@Injectable()
export class PresentationEventsService {
  constructor(
    @InjectModel(PresentationEvent.name)
    private presentationEventModel: Model<PresentationEventDocument>,
    private readonly authService: AuthService,
  ) {}

  private identityLookupKeys(
    row: Pick<PresentationEvent, 'clientId' | 'viewerDiscordId' | 'viewerUserId'>,
  ): string[] {
    const keys = new Set<string>();
    for (const raw of [row.clientId, row.viewerDiscordId, row.viewerUserId]) {
      const trimmed = raw?.trim();
      if (trimmed) {
        keys.add(trimmed);
      }
    }
    return [...keys];
  }

  private pickResolvedUser(
    row: Pick<PresentationEvent, 'clientId' | 'viewerDiscordId' | 'viewerUserId'>,
    usersByKey: Map<string, DiscordUserLookup>,
  ): DiscordUserLookup | undefined {
    for (const key of this.identityLookupKeys(row)) {
      const user = usersByKey.get(key);
      if (user) {
        return user;
      }
    }
    return undefined;
  }

  /** Discord snowflake for display — OpenLP `clientId` is usually Mongo user id from `/api/auth/me`. */
  private discordIdForDisplay(
    row: Pick<PresentationEvent, 'source' | 'clientId' | 'viewerDiscordId'>,
  ) {
    if (row.viewerDiscordId?.trim()) {
      const id = row.viewerDiscordId.trim();
      if (!this.authService.isMongoObjectId(id)) {
        return id;
      }
    }
    if (row.source === 'openlp' && row.clientId?.trim()) {
      const id = row.clientId.trim();
      if (!this.authService.isMongoObjectId(id)) {
        return id;
      }
    }
    return undefined;
  }

  private mapRow(
    row: PresentationEvent & { _id: unknown },
    resolvedUser?: DiscordUserLookup | null,
  ) {
    const viewerUsername = row.viewerUsername ?? resolvedUser?.username;
    const viewerDiscordId =
      (row.viewerDiscordId &&
      !this.authService.isMongoObjectId(row.viewerDiscordId)
        ? row.viewerDiscordId
        : undefined) ??
      resolvedUser?.discordId ??
      this.discordIdForDisplay(row);
    const viewerUserId = row.viewerUserId ?? resolvedUser?.id;

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
      viewerUserId,
      viewerUsername,
      viewerDiscordId,
      viewerAvatar: resolvedUser?.avatar ?? undefined,
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
    viewerUsername?: string;
    timezone?: string;
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
    if (query.viewerUsername?.trim()) {
      filter.viewerUsername = {
        $regex: query.viewerUsername.trim(),
        $options: 'i',
      };
    }
    if (query.timezone?.trim()) {
      filter.timezone = { $regex: query.timezone.trim(), $options: 'i' };
    }
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
    let resolvedUser: DiscordUserLookup | null = null;
    let viewer: Omit<ViewerIdentity, 'viewerAvatar'> = {};
    if (dto.clientId?.trim()) {
      resolvedUser = await this.authService.resolveUserByClientId(dto.clientId);
      if (resolvedUser) {
        viewer = {
          viewerUserId: resolvedUser.id,
          viewerUsername: resolvedUser.username,
          viewerDiscordId: resolvedUser.discordId,
        };
      } else if (!this.authService.isMongoObjectId(dto.clientId)) {
        viewer = { viewerDiscordId: dto.clientId.trim() };
      }
    }

    const event = await this.presentationEventModel.create({
      source: 'openlp',
      clientId: dto.clientId,
      openlpSongId: dto.openlpSongId,
      mongoSongId: dto.mongoSongId,
      title: dto.title,
      serviceItemTitle: dto.serviceItemTitle,
      presentedAt: dto.presentedAt ? new Date(dto.presentedAt) : new Date(),
      metadata: dto.metadata ?? {},
      viewerUserId: viewer.viewerUserId,
      viewerUsername: viewer.viewerUsername,
      viewerDiscordId: viewer.viewerDiscordId,
    });
    return this.mapRow(event.toObject(), resolvedUser);
  }

  /**
   * Link historical OpenLP rows (`clientId`) to Mongo users by Discord id or Mongo id.
   */
  async backfillViewerIdentityFromClientId(
    limit = 2000,
  ): Promise<{ scanned: number; updated: number }> {
    const events = await this.presentationEventModel
      .find({
        clientId: { $exists: true, $nin: [null, ''] },
        $or: [
          { viewerUsername: { $exists: false } },
          { viewerUsername: null },
          { viewerUsername: '' },
          { viewerUserId: { $exists: false } },
          { viewerUserId: null },
          { viewerUserId: '' },
        ],
      })
      .sort({ presentedAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    const clientIds = events
      .map((e) => e.clientId?.trim())
      .filter((id): id is string => Boolean(id));
    const usersByKey =
      await this.authService.resolveUsersByClientIds(clientIds);

    let updated = 0;
    for (const event of events) {
      const clientId = event.clientId?.trim();
      if (!clientId) continue;
      const user = usersByKey.get(clientId);
      if (!user) continue;

      await this.presentationEventModel.updateOne(
        { _id: event._id },
        {
          $set: {
            viewerUserId: user.id,
            viewerUsername: user.username,
            viewerDiscordId: user.discordId,
          },
        },
      );
      updated += 1;
    }

    return { scanned: events.length, updated };
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

    return this.mapRow(event.toObject(), null);
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
      viewerUsername: query.viewerUsername,
      timezone: query.timezone,
      authenticated:
        query.authenticated === 'true'
          ? true
          : query.authenticated === 'false'
            ? false
            : undefined,
      from: query.from,
      to: query.to,
    });

    const sortFields = [
      'presentedAt',
      'title',
      'source',
      'viewerUsername',
      'deviceType',
      'viewContext',
      'timezone',
    ] as const;
    const sortBy = sortFields.includes(
      query.sortBy as (typeof sortFields)[number],
    )
      ? query.sortBy!
      : 'presentedAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };
    if (sortBy !== 'presentedAt') {
      sort.presentedAt = -1;
    }

    const [data, total] = await Promise.all([
      this.presentationEventModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.presentationEventModel.countDocuments(filter).exec(),
    ]);

    const lookupKeys = data.flatMap((row) =>
      this.identityLookupKeys(row as PresentationEvent),
    );
    const usersByKey =
      await this.authService.resolveUsersByClientIds(lookupKeys);

    return {
      data: data.map((row) => {
        const typed = row as PresentationEvent & { _id: unknown };
        return this.mapRow(typed, this.pickResolvedUser(typed, usersByKey));
      }),
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

    if (query.groupBy === 'user') {
      const byUser = await this.presentationEventModel.aggregate([
        { $match: match },
        {
          $addFields: {
            statsDiscordId: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$viewerDiscordId', null] },
                    { $ne: ['$viewerDiscordId', ''] },
                  ],
                },
                '$viewerDiscordId',
                {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$source', 'openlp'] },
                        { $ne: ['$clientId', null] },
                        { $ne: ['$clientId', ''] },
                      ],
                    },
                    '$clientId',
                    '$sessionId',
                  ],
                },
              ],
            },
            statsUsername: { $ifNull: ['$viewerUsername', null] },
          },
        },
        {
          $group: {
            _id: { $ifNull: ['$statsDiscordId', 'anonymous'] },
            count: { $sum: 1 },
            label: { $first: '$statsUsername' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ]);
      const ids = byUser
        .map((row) => (typeof row._id === 'string' ? row._id : null))
        .filter((id): id is string => Boolean(id && id !== 'anonymous'));
      const usersByKey = await this.authService.resolveUsersByClientIds(ids);
      grouped = byUser.map((row) => {
        const key = String(row._id);
        const user = usersByKey.get(key);
        const label =
          row.label ||
          user?.username ||
          (key === 'anonymous' ? 'Anonimowy' : `Discord ${key}`);
        return { key, label, count: row.count };
      });
    } else if (query.groupBy === 'source') {
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
