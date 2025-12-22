import type { Page, Route } from '@playwright/test';
import type { SongResponseDto } from '@openlp/shared';
import { baseSongs, buildSong } from '../fixtures/songs';

type SearchHitMap = Record<string, SongResponseDto[]>;

interface SongApiMockOptions {
  songs?: SongResponseDto[];
  searchHits?: SearchHitMap;
  failFirstList?: boolean;
}

export interface SongApiMock {
  store: Map<string, SongResponseDto>;
  getLastCreatePayload: () => unknown;
  getLastUpdatePayload: () => unknown;
  getLastDeletedId: () => string | null;
  getExportDownloadCount: () => number;
}

export interface AuthUserMock {
  id?: string;
  username?: string;
  discriminator?: string | null;
  avatar?: string | null;
  discordId?: string;
  discordRoles?: string[] | null;
  hasEditPermission?: boolean;
}

const BASE_LIST_LIMIT = 200;

export async function setupSongApiMock(
  page: Page,
  options: SongApiMockOptions = {}
): Promise<SongApiMock> {
  const store = new Map<string, SongResponseDto>(
    (options.songs ?? baseSongs).map(song => [song.id, song])
  );
  const defaultSearchHits: SearchHitMap = {
    nadzieja: [store.get('song-2')!].filter(Boolean),
    swiatlo: [store.get('song-1')!].filter(Boolean),
    światło: [store.get('song-1')!].filter(Boolean),
    laska: [store.get('song-3')!].filter(Boolean),
    łaska: [store.get('song-3')!].filter(Boolean),
  };
  const searchHits: SearchHitMap = {
    ...defaultSearchHits,
    ...(options.searchHits ?? {}),
  };

  let failFirstList = options.failFirstList ?? false;
  let lastCreatePayload: unknown;
  let lastUpdatePayload: unknown;
  let lastDeletedId: string | null = null;
  let exportDownloads = 0;
  const fillerId = (page: number, index: number) => `filler-${page}-${index + 1}`;

  await page.route('**/api/songs/export/zip', async route => {
    exportDownloads += 1;
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
      },
      body: 'PK\u0005\u0006mock',
    });
  });

  await page.route(/\/api\/songs(\?.*)?$/, async route => {
    const method = route.request().method();
    if (method.toUpperCase() === 'GET') {
      await handleSongsList(route);
      return;
    }
    if (method.toUpperCase() === 'POST') {
      await handleCreate(route);
      return;
    }
    await route.continue();
  });

  await page.route(/\/api\/songs\/(?!export\/zip)([^/]+)$/, async route => {
    const method = route.request().method().toUpperCase();
    const songId = decodeURIComponent(route.request().url().split('/').pop() ?? '');

    if (method === 'GET') {
      const song = store.get(songId);
      if (!song) {
        await route.fulfill({
          status: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Song not found' }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(song),
      });
      return;
    }

    if (method === 'PATCH') {
      const existing = store.get(songId);
      if (!existing) {
        await route.fulfill({
          status: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Song not found' }),
        });
        return;
      }
      const payload = await route.request().postDataJSON();
      lastUpdatePayload = payload;
      const updated: SongResponseDto = {
        ...existing,
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      store.set(songId, updated);
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      return;
    }

    if (method === 'DELETE') {
      const existed = store.delete(songId);
      lastDeletedId = existed ? songId : null;
      await route.fulfill({
        status: 204,
      });
      return;
    }

    await route.continue();
  });

  async function handleSongsList(route: Route) {
    if (failFirstList) {
      failFirstList = false;
      await route.fulfill({
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Mocked server error' }),
      });
      return;
    }

    const url = new URL(route.request().url());
    const pageParam = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? BASE_LIST_LIMIT);
    const searchParam = normalize(url.searchParams.get('search') ?? '');
    let data: SongResponseDto[] = [];
    let total = store.size;

    if (searchParam) {
      const hits =
        searchHits[searchParam] ??
        Array.from(store.values()).filter(song => normalize(song.title).includes(searchParam));
      data = hits.slice(0, limit);
      total = hits.length;
    } else if (pageParam <= 2) {
      const allSongs = Array.from(store.values());
      const actual = pageParam === 1 ? allSongs.slice(0, Math.min(limit, allSongs.length)) : [];
      const fillerNeeded = limit - actual.length;
      const fillerSongs =
        fillerNeeded > 0
          ? Array.from({ length: fillerNeeded }, (_value, idx) =>
              buildSong(fillerId(pageParam, idx), {
                title: `Dodatkowa Pieśń ${pageParam}-${idx + 1}`,
                tags: [],
              })
            )
          : [];
      data = [...actual, ...fillerSongs];
      total = limit * 2;
    } else {
      data = [];
      total = limit * 2;
    }

    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data,
        meta: {
          page: pageParam,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / Math.max(limit, 1))),
        },
      }),
    });
  }

  async function handleCreate(route: Route) {
    const payload = await route.request().postDataJSON();
    lastCreatePayload = payload;
    const id = `song-${store.size + 1}`;
    const newSong = buildSong(id, {
      title: payload.title ?? `Nowa Pieśń ${store.size + 1}`,
      verses: payload.verses ?? buildSong(id).verses,
    });
    store.set(id, newSong);
    await route.fulfill({
      status: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSong),
    });
  }

  return {
    store,
    getLastCreatePayload: () => lastCreatePayload,
    getLastUpdatePayload: () => lastUpdatePayload,
    getLastDeletedId: () => lastDeletedId,
    getExportDownloadCount: () => exportDownloads,
  };
}

export async function setupAuthMock(page: Page, user?: AuthUserMock | null) {
  await page.route('**/api/auth/me', async route => {
    if (!user) {
      await route.fulfill({
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id ?? 'user-1',
        username: user.username ?? 'Moderator',
        discriminator: user.discriminator ?? '0001',
        avatar: user.avatar ?? null,
        discordId: user.discordId ?? '123456789',
        discordRoles: user.discordRoles ?? ['editors'],
        hasEditPermission: user.hasEditPermission ?? true,
      }),
    });
  });
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
