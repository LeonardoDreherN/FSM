import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Technician } from '../modules/technicians/entities/technician.entity';
import { RouteHistory } from './entities/route-history.entity';

interface LocationPayload {
  technicianId: string;
  companyId: string;
  lat: number;
  lng: number;
  heading?: number;
  speedKmh?: number;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LocationGateway.name);
  private readonly persistQueue = new Map<string, LocationPayload>();

  constructor(
    @InjectRedis()
    private readonly redis: Redis,
    @InjectRepository(Technician)
    private readonly techRepo: Repository<Technician>,
    @InjectRepository(RouteHistory)
    private readonly historyRepo: Repository<RouteHistory>,
  ) {
    // Persiste lote no PostgreSQL a cada 5 minutos
    setInterval(() => this.flushLocationsToDB(), 5 * 60 * 1000);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('technician:location')
  async handleLocation(
    @MessageBody() payload: LocationPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { technicianId, companyId, lat, lng, heading, speedKmh } = payload;

    // 1. Grava no Redis GeoIndex (O(log N), < 1ms)
    await this.redis.geoadd(
      `company:${companyId}:technicians`,
      lng,
      lat,
      technicianId,
    );

    // 2. Salva metadados extras no hash (heading, speed, timestamp)
    await this.redis.hset(`tech:${technicianId}:meta`, {
      heading: heading ?? 0,
      speedKmh: speedKmh ?? 0,
      lat,
      lng,
      ts: Date.now(),
    });

    // 3. Enfileira para persistência batch no PG
    this.persistQueue.set(technicianId, payload);

    // 4. Broadcast para gestores na sala da empresa
    this.server.to(`company:${companyId}`).emit('location:update', {
      technicianId,
      lat,
      lng,
      heading,
      speedKmh,
      ts: Date.now(),
    });
  }

  @SubscribeMessage('manager:join')
  handleManagerJoin(
    @MessageBody() data: { companyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`company:${data.companyId}`);
    this.logger.log(`Manager joined company room: ${data.companyId}`);
  }

  @SubscribeMessage('technician:join')
  handleTechnicianJoin(
    @MessageBody() data: { technicianId: string; companyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`tech:${data.technicianId}`);
    client.join(`company:${data.companyId}`);
  }

  async emitRouteUpdate(technicianId: string, companyId: string, orders: any[]) {
    this.server.to(`tech:${technicianId}`).emit('route:updated', { orders });
    this.server.to(`company:${companyId}`).emit('route:updated', { technicianId, orders });
  }

  private async flushLocationsToDB() {
    if (this.persistQueue.size === 0) return;

    const entries = Array.from(this.persistQueue.values());
    this.persistQueue.clear();

    for (const e of entries) {
      try {
        await this.historyRepo.query(
          `INSERT INTO route_history (technician_id, location, heading, speed_kmh)
           VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5)`,
          [e.technicianId, e.lng, e.lat, e.heading ?? null, e.speedKmh ?? null],
        );

        await this.techRepo.query(
          `UPDATE technicians SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
           heading = $3, speed_kmh = $4, updated_at = NOW() WHERE id = $5`,
          [e.lng, e.lat, e.heading ?? null, e.speedKmh ?? null, e.technicianId],
        );
      } catch (err) {
        this.logger.error(`Erro ao persistir localização do técnico ${e.technicianId}: ${err.message}`);
      }
    }

    this.logger.log(`Flushed ${entries.length} locations to PostgreSQL`);
  }
}
