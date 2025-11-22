import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectConnection() private connection: Connection,
  ) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  async health() {
    try {
      const state = this.connection.readyState;
      return {
        status: state === 1 ? 'ok' : 'error',
        database: state === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: 'error',
        database: 'disconnected',
        error: error?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
