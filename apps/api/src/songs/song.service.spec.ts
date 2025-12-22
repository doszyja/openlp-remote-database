import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SongService } from './song.service';
import { Song, SongDocument } from '../schemas/song.schema';
import { Tag, TagDocument } from '../schemas/tag.schema';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';

describe('SongService', () => {
  let service: SongService;
  let songModel: Model<SongDocument>;
  let tagModel: Model<TagDocument>;

  const mockSongModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockTagModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SongService,
        {
          provide: getModelToken(Song.name),
          useValue: mockSongModel,
        },
        {
          provide: getModelToken(Tag.name),
          useValue: mockTagModel,
        },
      ],
    }).compile();

    service = module.get<SongService>(SongService);
    songModel = module.get<Model<SongDocument>>(getModelToken(Song.name));
    tagModel = module.get<Model<TagDocument>>(getModelToken(Tag.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a song with verses as string and auto-generate search fields', async () => {
      const createSongDto: CreateSongDto = {
        title: 'Amazing Grace',
        number: '123',
        language: 'en',
        chorus: 'Amazing grace, how sweet the sound',
        verses: 'Verse 1 content\n\nVerse 2 content',
        tags: ['worship', 'classic'],
      };

      const mockCreatedSong = {
        _id: '507f1f77bcf86cd799439011',
        ...createSongDto,
        searchTitle: 'amazing grace',
        searchLyrics: 'verse 1 content\n\nverse 2 content',
        tags: ['tag1', 'tag2'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTagModel.findOne.mockResolvedValueOnce({
        _id: 'tag1',
        name: 'worship',
      });
      mockTagModel.findOne.mockResolvedValueOnce({
        _id: 'tag2',
        name: 'classic',
      });
      mockSongModel.create.mockResolvedValue(mockCreatedSong);
      mockSongModel.findOne.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        ...mockCreatedSong,
        tags: [
          { _id: 'tag1', name: 'worship' },
          { _id: 'tag2', name: 'classic' },
        ],
        verses: 'Verse 1 content\n\nVerse 2 content',
        searchTitle: 'amazing grace',
        searchLyrics: 'verse 1 content\n\nverse 2 content',
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439011',
          ...mockCreatedSong,
          tags: [
            { _id: 'tag1', name: 'worship' },
            { _id: 'tag2', name: 'classic' },
          ],
        }),
      });

      const result = await service.create(createSongDto);

      expect(mockSongModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Amazing Grace',
          verses: 'Verse 1 content\n\nVerse 2 content',
          searchTitle: 'amazing grace',
          searchLyrics: 'verse 1 content\n\nverse 2 content',
        }),
      );
      expect(result.verses).toBe('Verse 1 content\n\nVerse 2 content');
      expect(result.searchTitle).toBe('amazing grace');
      expect(result.searchLyrics).toBe('verse 1 content\n\nverse 2 content');
    });

    it('should handle empty verses string', async () => {
      const createSongDto: CreateSongDto = {
        title: 'Empty Song',
        verses: '',
        tags: [],
      };

      const mockCreatedSong = {
        _id: '507f1f77bcf86cd799439011',
        ...createSongDto,
        searchTitle: 'empty song',
        searchLyrics: '',
        tags: [],
      };

      mockSongModel.create.mockResolvedValue(mockCreatedSong);
      mockSongModel.findOne.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        ...mockCreatedSong,
        tags: [],
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439011',
          ...mockCreatedSong,
          tags: [],
        }),
      });

      const result = await service.create(createSongDto);

      expect(mockSongModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          verses: '',
          searchLyrics: '',
        }),
      );
      expect(result.verses).toBe('');
    });

    it('should preserve verse order when storing as string', async () => {
      const createSongDto: CreateSongDto = {
        title: 'Ordered Verses',
        verses: 'First verse\n\nSecond verse\n\nThird verse',
        tags: [],
      };

      const mockCreatedSong = {
        _id: '507f1f77bcf86cd799439011',
        ...createSongDto,
        searchTitle: 'ordered verses',
        searchLyrics: 'first verse\n\nsecond verse\n\nthird verse',
        tags: [],
      };

      mockSongModel.create.mockResolvedValue(mockCreatedSong);
      mockSongModel.findOne.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        ...mockCreatedSong,
        tags: [],
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439011',
          ...mockCreatedSong,
          tags: [],
        }),
      });

      const result = await service.create(createSongDto);

      expect(result.verses).toBe('First verse\n\nSecond verse\n\nThird verse');
      // Verify order is preserved
      const verses = result.verses.split('\n\n');
      expect(verses[0]).toBe('First verse');
      expect(verses[1]).toBe('Second verse');
      expect(verses[2]).toBe('Third verse');
    });
  });

  describe('update', () => {
    it('should update verses and regenerate searchLyrics', async () => {
      const songId = '507f1f77bcf86cd799439011';
      const updateSongDto: UpdateSongDto = {
        title: 'Updated Title',
        verses: 'New verse content',
      };

      const existingSong = {
        _id: songId,
        title: 'Original Title',
        verses: 'Old verse content',
        searchTitle: 'original title',
        searchLyrics: 'old verse content',
      };

      mockSongModel.findOne.mockResolvedValue(existingSong);
      mockSongModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
      mockSongModel.findOne.mockResolvedValueOnce(existingSong);
      mockSongModel.findOne.mockResolvedValueOnce({
        _id: songId,
        ...updateSongDto,
        searchTitle: 'updated title',
        searchLyrics: 'new verse content',
        tags: [],
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: songId,
          ...updateSongDto,
          searchTitle: 'updated title',
          searchLyrics: 'new verse content',
          tags: [],
        }),
      });

      await service.update(songId, updateSongDto);

      expect(mockSongModel.updateOne).toHaveBeenCalledWith(
        { _id: songId },
        expect.objectContaining({
          verses: 'New verse content',
          searchTitle: 'updated title',
          searchLyrics: 'new verse content',
        }),
      );
    });

    it('should regenerate searchTitle when title changes', async () => {
      const songId = '507f1f77bcf86cd799439011';
      const updateSongDto: UpdateSongDto = {
        title: 'New Title',
      };

      const existingSong = {
        _id: songId,
        title: 'Old Title',
        verses: 'Some verses',
        searchTitle: 'old title',
        searchLyrics: 'some verses',
      };

      mockSongModel.findOne.mockResolvedValue(existingSong);
      mockSongModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
      mockSongModel.findOne.mockResolvedValueOnce(existingSong);
      mockSongModel.findOne.mockResolvedValueOnce({
        _id: songId,
        ...updateSongDto,
        verses: existingSong.verses,
        searchTitle: 'new title',
        searchLyrics: existingSong.searchLyrics,
        tags: [],
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: songId,
          ...updateSongDto,
          verses: existingSong.verses,
          searchTitle: 'new title',
          searchLyrics: existingSong.searchLyrics,
          tags: [],
        }),
      });

      await service.update(songId, updateSongDto);

      expect(mockSongModel.updateOne).toHaveBeenCalledWith(
        { _id: songId },
        expect.objectContaining({
          searchTitle: 'new title',
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return songs with verses as string', async () => {
      const mockSongs = [
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'Song 1',
          verses: 'Verse 1\n\nVerse 2',
          searchTitle: 'song 1',
          searchLyrics: 'verse 1\n\nverse 2',
          tags: [{ _id: 'tag1', name: 'worship' }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockSongModel.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockSongs),
      });
      mockSongModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data[0].verses).toBe('Verse 1\n\nVerse 2');
      expect(result.data[0].searchTitle).toBe('song 1');
      expect(result.data[0].searchLyrics).toBe('verse 1\n\nverse 2');
      expect(typeof result.data[0].verses).toBe('string');
    });

    it('should search in verses string field', async () => {
      const query: any = { search: 'grace' };
      const mockSongs = [
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'Amazing Grace',
          verses: 'Amazing grace, how sweet the sound',
          searchTitle: 'amazing grace',
          searchLyrics: 'amazing grace, how sweet the sound',
          tags: [],
        },
      ];

      mockSongModel.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockSongs),
      });
      mockSongModel.countDocuments.mockResolvedValue(1);

      await service.findAll(query);

      expect(mockSongModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            { title: { $regex: 'grace', $options: 'i' } },
            { verses: { $regex: 'grace', $options: 'i' } },
          ]),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return song with verses as string', async () => {
      const songId = '507f1f77bcf86cd799439011';
      const mockSong = {
        _id: songId,
        title: 'Test Song',
        verses: 'Verse content here',
        searchTitle: 'test song',
        searchLyrics: 'verse content here',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSongModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockSong),
      });

      const result = await service.findOne(songId);

      expect(result.verses).toBe('Verse content here');
      expect(typeof result.verses).toBe('string');
      expect(result.searchTitle).toBe('test song');
      expect(result.searchLyrics).toBe('verse content here');
    });
  });
});
