import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { ServicePlanService } from './service-plan.service';

@Injectable()
export class WebSocketServerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebSocketServerService.name);
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  constructor(
    @Inject(forwardRef(() => ServicePlanService))
    private readonly servicePlanService: ServicePlanService,
  ) {}

  onModuleInit() {
    // Server will be initialized in main.ts after app is created
  }

  initialize(httpServer: HttpServer, path: string = '/ws/service-plans') {
    this.wss = new WebSocketServer({ 
      server: httpServer,
      path,
    });

    this.wss.on('connection', async (ws: WebSocket) => {
      this.clients.add(ws);
      this.logger.debug(`Client connected. Total clients: ${this.clients.size}`);

      // Send current active song on connection
      try {
        const active = await this.servicePlanService.getActiveSong();
        ws.send(JSON.stringify({ type: 'activeSong', payload: active }));
      } catch (error) {
        this.logger.error('Error sending initial active song', error as Error);
      }

      ws.on('close', () => {
        this.clients.delete(ws);
        this.logger.debug(`Client disconnected. Total clients: ${this.clients.size}`);
      });

      ws.on('error', (error) => {
        this.logger.error('WebSocket error', error);
      });
    });

    const address = httpServer.address();
    const port = typeof address === 'string' ? address : address?.port || 'unknown';
    this.logger.log(`WebSocket server started on port ${port}, path: ${path}`);
  }

  async broadcastActiveSong() {
    if (!this.wss || this.clients.size === 0) {
      return;
    }

    try {
      const active = await this.servicePlanService.getActiveSong();
      const message = JSON.stringify({ type: 'activeSong', payload: active });
      
      this.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        } else {
          this.clients.delete(client);
        }
      });

      this.logger.debug(`Broadcasted active song to ${this.clients.size} clients`);
    } catch (error) {
      this.logger.error('Error broadcasting active song', error as Error);
    }
  }

  onModuleDestroy() {
    if (this.wss) {
      this.clients.forEach((client) => {
        client.close();
      });
      this.clients.clear();
      this.wss.close();
      this.logger.log('WebSocket server closed');
    }
  }
}

