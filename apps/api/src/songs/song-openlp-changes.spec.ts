import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SongService } from './song.service';
import { Song } from '../schemas/song.schema';
import { Tag } from '../schemas/tag.schema';
import { AuditLogService } from '../audit-log/audit-log.service';
import { SongsVersionService } from './songs-version.service';
import { SongVersionService } from './song-version.service';

describe('SongService.findChangesForOpenlpSince', () => {
  let service: SongService;

  const songsVersionService = {
    getVersion: jest.fn(),
    getChangesSince: jest.fn(),
  };

  const mockSongModel = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SongService,
        { provide: getModelToken(Song.name), useValue: mockSongModel },
        { provide: getModelToken(Tag.name), useValue: {} },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
        { provide: SongsVersionService, useValue: songsVersionService },
        { provide: SongVersionService, useValue: { createVersion: jest.fn() } },
      ],
    }).compile();

    service = module.get(SongService);
  });

  it('returns no songs when client already has current catalog version', async () => {
    songsVersionService.getVersion.mockResolvedValue(12);

    const result = await service.findChangesForOpenlpSince(12);

    expect(result).toEqual({
      version: 12,
      sinceVersion: 12,
      deletedSongIds: [],
      songs: [],
      full: false,
    });
    expect(songsVersionService.getChangesSince).not.toHaveBeenCalled();
  });

  it('returns only changed songs since version (latest action per song wins)', async () => {
    songsVersionService.getVersion.mockResolvedValue(6);
    songsVersionService.getChangesSince.mockResolvedValue([
      { catalogVersion: 4, songId: 'song-a', action: 'create' },
      { catalogVersion: 5, songId: 'song-b', action: 'delete' },
      { catalogVersion: 6, songId: 'song-a', action: 'update' },
    ]);

    const findOpenlpCacheByIds = jest
      .spyOn(service, 'findOpenlpCacheByIds')
      .mockResolvedValue([
        {
          id: 'song-a',
          title: 'Updated song',
          lyricsXml: '<lyrics></lyrics>',
        },
      ] as any);

    const result = await service.findChangesForOpenlpSince(3);

    expect(findOpenlpCacheByIds).toHaveBeenCalledWith(['song-a']);
    expect(result.version).toBe(6);
    expect(result.sinceVersion).toBe(3);
    expect(result.deletedSongIds).toEqual(['song-b']);
    expect(result.songs).toHaveLength(1);
    expect(result.songs[0].id).toBe('song-a');
    expect(result.full).toBe(false);
  });

  it('omits upsert when latest action for a song is delete', async () => {
    songsVersionService.getVersion.mockResolvedValue(4);
    songsVersionService.getChangesSince.mockResolvedValue([
      { catalogVersion: 3, songId: 'song-x', action: 'update' },
      { catalogVersion: 4, songId: 'song-x', action: 'delete' },
    ]);

    const findOpenlpCacheByIds = jest.spyOn(service, 'findOpenlpCacheByIds');

    const result = await service.findChangesForOpenlpSince(2);

    expect(findOpenlpCacheByIds).not.toHaveBeenCalled();
    expect(result.deletedSongIds).toEqual(['song-x']);
    expect(result.songs).toEqual([]);
  });

  it('falls back to full catalog when versions diverged but changelog is empty (legacy)', async () => {
    songsVersionService.getVersion.mockResolvedValue(9);
    songsVersionService.getChangesSince.mockResolvedValue([]);

    jest.spyOn(service, 'findAllForOpenlpCache').mockResolvedValue([
      { id: 'one', title: 'One' },
      { id: 'two', title: 'Two' },
    ] as any);

    const result = await service.findChangesForOpenlpSince(7);

    expect(result.full).toBe(true);
    expect(result.songs).toHaveLength(2);
    expect(result.deletedSongIds).toEqual([]);
    expect(result.version).toBe(9);
  });

  it('does not full-fallback when sinceVersion is 0 and changelog empty', async () => {
    songsVersionService.getVersion.mockResolvedValue(3);
    songsVersionService.getChangesSince.mockResolvedValue([]);

    const fullSpy = jest.spyOn(service, 'findAllForOpenlpCache');

    const result = await service.findChangesForOpenlpSince(0);

    expect(fullSpy).not.toHaveBeenCalled();
    expect(result.songs).toEqual([]);
    expect(result.full).toBe(false);
  });
});