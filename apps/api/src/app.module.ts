import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { SongModule } from './songs/song.module';
import { ServicePlanModule } from './service-plan/service-plan.module';
import { AuthModule } from './auth/auth.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Security: Rate limiting/throttling
    // Protects against DDoS attacks and brute force attempts
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 seconds
        limit: 2000, // 2000 requests per 60 seconds per IP
      },
      {
        name: 'strict',
        ttl: 900000, // 15 minutes
        limit: 100, // 100 requests per 15 minutes (for auth endpoints)
      },
      {
        name: 'search',
        ttl: 60000, // 60 seconds
        limit: 600, // 600 requests per 60 seconds (for search endpoints)
      },
      {
        name: 'zip-export',
        ttl: 60000, // 60 seconds
        limit: 50, // 10 requests per 60 seconds per user
      },
    ]),
    DatabaseModule,
    AuthModule,
    SongModule,
    ServicePlanModule,
    AuditLogModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Security: Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
