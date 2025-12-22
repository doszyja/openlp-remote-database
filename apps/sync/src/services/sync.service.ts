import { ApiClientService } from './api-client.service';
import { OpenLPDatabaseService } from './openlp-db.service';
import type { SongResponseDto } from '@openlp/shared';

export interface SyncResult {
  created: number;
  updated: number;
  errors: number;
  skipped: number;
  total: number;
}

export interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  verbose?: boolean;
}

export class SyncService {
  constructor(
    private apiClient: ApiClientService,
    private openlpDb: OpenLPDatabaseService
  ) {}

  /**
   * Sync all songs from backend to OpenLP database
   */
  async syncAll(options: SyncOptions = {}): Promise<SyncResult> {
    const result: SyncResult = {
      created: 0,
      updated: 0,
      errors: 0,
      skipped: 0,
      total: 0,
    };

    try {
      // Fetch all songs from backend
      if (options.verbose) {
        console.log('Fetching songs from backend API...');
      }
      const songs = await this.apiClient.fetchAllSongs();
      result.total = songs.length;

      if (options.verbose) {
        console.log(`Found ${songs.length} songs to sync`);
      }

      // Sync each song
      for (const song of songs) {
        try {
          await this.syncSong(song, options);
          // Check if song has OpenLP mapping (would need to be fetched from backend)
          // For now, assume all are new
          result.created++;
        } catch (error) {
          result.errors++;
          if (options.verbose) {
            console.error(`Error syncing song "${song.title}" (${song.id}):`, error);
          }
        }
      }

      return result;
    } catch (error) {
      if (options.verbose) {
        console.error('Fatal error during sync:', error);
      }
      throw error;
    }
  }

  /**
   * Sync a single song
   */
  private async syncSong(song: SongResponseDto, options: SyncOptions): Promise<void> {
    if (options.dryRun) {
      if (options.verbose) {
        console.log(`[DRY RUN] Would sync: ${song.title}`);
      }
      return;
    }

    // TODO: Get OpenLP mapping from backend API if needed
    // For now, we'll try to find by title or create new
    const openlpIdNumber = undefined;

    // Verses is now a single string field, no need to sort
    // The OpenLP service will handle formatting it to XML
    const newOpenlpId = this.openlpDb.upsertSong(song, openlpIdNumber);

    if (options.verbose) {
      if (openlpIdNumber) {
        console.log(`Updated song: ${song.title} (OpenLP ID: ${newOpenlpId})`);
      } else {
        console.log(`Created song: ${song.title} (OpenLP ID: ${newOpenlpId})`);
      }
    }
  }

  /**
   * Sync a single song by ID
   */
  async syncSongById(songId: string, options: SyncOptions = {}): Promise<void> {
    try {
      const song = await this.apiClient.getSongById(songId);
      await this.syncSong(song, options);
    } catch (error) {
      if (options.verbose) {
        console.error(`Error syncing song ${songId}:`, error);
      }
      throw error;
    }
  }
}
