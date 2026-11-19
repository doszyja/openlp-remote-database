import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SongsVersionService } from './songs-version.service';
import { SongsVersion } from '../schemas/songs-version.schema';
import { SongsCatalogChange } from '../schemas/songs-catalog-change.schema';

describe('SongsVersionService', () => {
  let service: SongsVersionService;

  const mockVersionDoc = {
    version: 4,
    lastUpdated: new Date(),
    save: jest.fn(),
  };

  const versionModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const changeModel = {
    create: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockVersionDoc.version = 4;
    mockVersionDoc.save.mockImplementation(async function save(
      this: typeof mockVersionDoc,
    ) {
      return this;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SongsVersionService,
        { provide: getModelToken(SongsVersion.name), useValue: versionModel },
        {
          provide: getModelToken(SongsCatalogChange.name),
          useValue: changeModel,
        },
      ],
    }).compile();

    service = module.get(SongsVersionService);
  });

  const mockFindOneExec = (doc: typeof mockVersionDoc | null) => {
    versionModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doc),
    });
  };

  describe('incrementVersion', () => {
    it('increments counter and writes catalog change when songId and action provided', async () => {
      mockFindOneExec(mockVersionDoc);
      changeModel.create.mockResolvedValue({});

      const version = await service.incrementVersion(
        '507f1f77bcf86cd799439011',
        'update',
      );

      expect(mockVersionDoc.version).toBe(5);
      expect(mockVersionDoc.save).toHaveBeenCalled();
      expect(version).toBe(5);
      expect(changeModel.create).toHaveBeenCalledWith({
        catalogVersion: 5,
        songId: '507f1f77bcf86cd799439011',
        action: 'update',
      });
    });

    it('increments without changelog row when songId or action missing', async () => {
      mockFindOneExec(mockVersionDoc);

      await service.incrementVersion();

      expect(changeModel.create).not.toHaveBeenCalled();
    });

    it('starts at version 1 when no version document exists', async () => {
      mockFindOneExec(null);
      versionModel.create.mockResolvedValue({ version: 1 });

      const version = await service.incrementVersion('abc', 'create');

      expect(version).toBe(1);
      expect(changeModel.create).toHaveBeenCalledWith({
        catalogVersion: 1,
        songId: 'abc',
        action: 'create',
      });
    });
  });

  describe('getChangesSince', () => {
    it('queries changes with catalogVersion greater than sinceVersion', async () => {
      const sort = jest.fn().mockReturnThis();
      const lean = jest.fn().mockReturnThis();
      const exec = jest
        .fn()
        .mockResolvedValue([
          { catalogVersion: 3, songId: 'a', action: 'update' },
        ]);
      changeModel.find.mockReturnValue({ sort, lean, exec });

      const rows = await service.getChangesSince(2);

      expect(changeModel.find).toHaveBeenCalledWith({
        catalogVersion: { $gt: 2 },
      });
      expect(sort).toHaveBeenCalledWith({ catalogVersion: 1 });
      expect(rows).toHaveLength(1);
    });

    it('returns empty array for negative sinceVersion', async () => {
      const rows = await service.getChangesSince(-1);
      expect(rows).toEqual([]);
      expect(changeModel.find).not.toHaveBeenCalled();
    });
  });
});
