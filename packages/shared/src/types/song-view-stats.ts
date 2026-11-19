export type SongViewSource = 'openlp' | 'browser';

export type SongViewContext = 'detail' | 'presentation' | 'live' | 'list';

export type SongViewGroupBy = 'song' | 'day' | 'source' | 'device' | 'user';

export interface SongViewEvent {
  id: string;
  source: SongViewSource;
  clientId?: string;
  openlpSongId?: number;
  mongoSongId?: string;
  title: string;
  serviceItemTitle?: string;
  presentedAt: string;
  viewerUserId?: string;
  viewerUsername?: string;
  viewerDiscordId?: string;
  /** Resolved from Mongo User when clientId is a Discord snowflake (OpenLP). */
  viewerAvatar?: string | null;
  sessionId?: string;
  pagePath?: string;
  viewContext?: SongViewContext;
  deviceType?: string;
  browserName?: string;
  osName?: string;
  screenWidth?: number;
  screenHeight?: number;
  language?: string;
  timezone?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
}

export interface SongViewEventsResponse {
  data: SongViewEvent[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SongViewSummary {
  from: string;
  to: string;
  clientId: string | null;
  source: SongViewSource | null;
  deviceType: string | null;
  totalEvents: number;
  authenticatedViews: number;
  anonymousViews: number;
  bySong: Array<{
    title: string;
    mongoSongId?: string;
    count: number;
    lastPresentedAt?: string;
  }>;
  byDay: Array<{ date: string; count: number }>;
  bySource: Array<{ source: SongViewSource; count: number }>;
  byDevice: Array<{ deviceType: string; count: number }>;
  grouped?: Array<{ key: string; label: string; count: number }>;
  groupedMeta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}