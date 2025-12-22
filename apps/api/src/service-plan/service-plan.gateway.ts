import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { ServicePlanService } from './service-plan.service';

@WebSocketGateway({
  path: '/ws/service-plans',
})
@Injectable()
export class ServicePlanGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: any;

  private readonly logger = new Logger(ServicePlanGateway.name);

  constructor(private readonly servicePlanService: ServicePlanService) {}

  async handleConnection(client: any) {
    this.logger.debug('Client connected to ServicePlanGateway');
    // On initial connection, send current active song (if any)
    try {
      const active = await this.servicePlanService.getActiveSong();
      client.send(JSON.stringify({ type: 'activeSong', payload: active }));
    } catch (error) {
      this.logger.error('Error sending initial active song', error as Error);
    }
  }

  handleDisconnect() {
    this.logger.debug('Client disconnected from ServicePlanGateway');
  }

  /**
   * Broadcast current active song to all connected clients.
   * Called from ServicePlanService when active song / verse changes.
   */
  async broadcastActiveSong() {
    try {
      const active = await this.servicePlanService.getActiveSong();
      // Domyślny adapter NestJS używa Socket.IO, więc możemy skorzystać z emit,
      // a adapter WebSocket (jeśli zostanie podłączony) może to zignorować lub obsłużyć inaczej.
      if (this.server && typeof this.server.emit === 'function') {
        this.server.emit('activeSong', active);
      }
    } catch (error) {
      this.logger.error('Error broadcasting active song', error as Error);
    }
  }
}


