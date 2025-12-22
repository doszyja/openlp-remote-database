import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Song, SongSchema } from '../schemas/song.schema';
import { Tag, TagSchema } from '../schemas/tag.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { AuditLog, AuditLogSchema } from '../schemas/audit-log.schema';
import {
  SongsVersion,
  SongsVersionSchema,
} from '../schemas/songs-version.schema';

@Module({
  imports: [
    MongooseModule.forRoot(
      (() => {
        // If DATABASE_URL is explicitly set, use it (even if it contains localhost)
        // This ensures local development uses local database and production uses remote
        if (process.env.DATABASE_URL) {
          console.log('[Database] Using DATABASE_URL from environment');
          return process.env.DATABASE_URL;
        }

        // Otherwise, construct from individual env vars or use defaults
        const user = process.env.MONGO_USER || 'openlp';
        const password = process.env.MONGO_PASSWORD || 'openlp_password';
        const db = process.env.MONGO_DB || 'openlp_db';
        // Use 'mongodb' as default host (Docker service name) when running in Docker
        // Use 'localhost' when running locally
        const host =
          process.env.MONGO_HOST ||
          (process.env.NODE_ENV === 'production' ? 'mongodb' : 'localhost');
        const port = process.env.MONGO_PORT || '27017';

        // If credentials are provided (not defaults), use auth
        // Otherwise, try without auth first (for existing volumes)
        const constructedUrl =
          user && password && user !== '' && password !== ''
            ? `mongodb://${user}:${password}@${host}:${port}/${db}?authSource=admin`
            : `mongodb://${host}:${port}/${db}`;

        console.log('[Database] Constructed connection URL from env vars');
        return constructedUrl;
      })(),
    ),
    MongooseModule.forFeature([
      { name: Song.name, schema: SongSchema },
      { name: Tag.name, schema: TagSchema },
      { name: User.name, schema: UserSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: SongsVersion.name, schema: SongsVersionSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
