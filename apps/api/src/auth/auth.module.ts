import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
// Temporarily disabled - requires Discord OAuth configuration
// import { DiscordStrategy } from './strategies/discord.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User, UserSchema } from '../schemas/user.schema';

@Module({
  imports: [
    PassportModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Temporarily disabled - requires Discord OAuth configuration
    // DiscordStrategy,
    JwtStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
