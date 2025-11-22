#!/usr/bin/env node

import { Command } from 'commander';
import { ApiClientService } from './services/api-client.service';
import { OpenLPDatabaseService } from './services/openlp-db.service';
import { SyncService } from './services/sync.service';
import { loadConfig } from './config/config';
import { Logger, LogLevel } from './utils/logger';

const program = new Command();

program
  .name('openlp-sync')
  .description('Sync songs from backend API to OpenLP SQLite database')
  .version('1.0.0');

program
  .command('sync')
  .description('Sync all songs from backend to OpenLP')
  .option('-d, --dry-run', 'Perform a dry run without making changes')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--force', 'Force sync even if already synced')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const logger = new Logger(options.verbose ? LogLevel.DEBUG : LogLevel.INFO);

      logger.info('Starting sync...');
      logger.info(`API URL: ${config.api.baseURL}`);
      logger.info(`OpenLP DB: ${config.openlp.dbPath}`);

      if (options.dryRun) {
        logger.warn('DRY RUN MODE - No changes will be made');
      }

      const apiClient = new ApiClientService(config.api.baseURL, config.api.apiKey);
      const openlpDb = new OpenLPDatabaseService(config.openlp.dbPath);
      const syncService = new SyncService(apiClient, openlpDb);

      const result = await syncService.syncAll({
        dryRun: options.dryRun,
        force: options.force,
        verbose: options.verbose,
      });

      logger.info('\n=== Sync Complete ===');
      logger.info(`Total songs: ${result.total}`);
      logger.info(`Created: ${result.created}`);
      logger.info(`Updated: ${result.updated}`);
      logger.info(`Errors: ${result.errors}`);
      logger.info(`Skipped: ${result.skipped}`);

      openlpDb.close();

      if (result.errors > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  });

program
  .command('sync-song <songId>')
  .description('Sync a single song by ID')
  .option('-d, --dry-run', 'Perform a dry run without making changes')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (songId: string, options) => {
    try {
      const config = loadConfig();
      const logger = new Logger(options.verbose ? LogLevel.DEBUG : LogLevel.INFO);

      logger.info(`Syncing song: ${songId}`);

      const apiClient = new ApiClientService(config.api.baseURL, config.api.apiKey);
      const openlpDb = new OpenLPDatabaseService(config.openlp.dbPath);
      const syncService = new SyncService(apiClient, openlpDb);

      await syncService.syncSongById(songId, {
        dryRun: options.dryRun,
        verbose: options.verbose,
      });

      logger.info('Song synced successfully');

      openlpDb.close();
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all songs in OpenLP database')
  .option('-v, --verbose', 'Show detailed information')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const logger = new Logger(options.verbose ? LogLevel.DEBUG : LogLevel.INFO);

      const openlpDb = new OpenLPDatabaseService(config.openlp.dbPath);
      const songs = openlpDb.getAllSongs();

      logger.info(`Found ${songs.length} songs in OpenLP database:\n`);

      for (const song of songs) {
        if (options.verbose) {
          logger.info(`ID: ${song.id}`);
          logger.info(`Title: ${song.title}`);
          if (song.alternate_title) {
            logger.info(`Number: ${song.alternate_title}`);
          }
          logger.info('---');
        } else {
          logger.info(`${song.id}: ${song.title}`);
        }
      }

      openlpDb.close();
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program.parse();
