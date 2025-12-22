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
        // If DATABASE_URL is explicitly set and doesn't contain localhost, use it
        if (
          process.env.DATABASE_URL &&
          !process.env.DATABASE_URL.includes('localhost')
        ) {
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
        if (user && password && user !== '' && password !== '') {
          return `mongodb://${user}:${password}@${host}:${port}/${db}?authSource=admin`;
        } else {
          return `mongodb://${host}:${port}/${db}`;
        }
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
