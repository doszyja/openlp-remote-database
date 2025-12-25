// @ts-expect-error - dotenv has types but TypeScript sometimes doesn't find them
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface Config {
  api: {
    baseURL: string;
    apiKey?: string;
  };
  openlp: {
    dbPath: string;
  };
  sync: {
    batchSize: number;
    timeout: number;
  };
}

export function loadConfig(): Config {
  const apiBaseURL = process.env.API_BASE_URL || 'http://localhost:3000/api';
  const apiKey = process.env.API_KEY;
  const openlpDbPath = process.env.OPENLP_DB_PATH;

  if (!openlpDbPath) {
    throw new Error('OPENLP_DB_PATH environment variable is required');
  }

  return {
    api: {
      baseURL: apiBaseURL,
      apiKey,
    },
    openlp: {
      dbPath: openlpDbPath,
    },
    sync: {
      batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '100', 10),
      timeout: parseInt(process.env.SYNC_TIMEOUT || '30000', 10),
    },
  };
}
