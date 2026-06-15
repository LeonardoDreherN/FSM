import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { RoutingEngine } from './routing.engine';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { Technician } from '../technicians/entities/technician.entity';
import { NotificationsService } from '../notifications/notifications.service';

interface OsStatusChangedPayload {
  orderId: string;
  companyId: string;
  technicianId: string;
  previous: string;
  current: string;
  order: ServiceOrder;
}

interface EmergencyPayload {
  orderId: string;
  companyId: string;
  lat: number;
  lng: number;
}

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  constructor(
    @InjectRepository(ServiceOrder)
    private readonly soRepo: Repository<ServiceOrder>,
    @InjectRepository(Technician)
    private readonly techRepo: Repository<Technician>,
    @InjectRedis()
    private readonly redis: Redis,
    private readonly engine: RoutingEngine,
    private readonly notifications: NotificationsService,
  ) {}

  @OnEvent('routing.os_status_changed')
  async handleOsStatusChanged(payload: OsStatusChangedPayload) {
    const { current, technicianId, companyId, order } = payload;

    if (current === 'completed' && technicianId) {
      await this.recalculateForTechnician(companyId, technicianId);
    }

    if (current === 'in_transit') {
      await this.notifications.sendTechnicianDispatched(order);
    }
  }

  @OnEvent('routing.emergency_os_created')
  async handleEmergencyOs(payload: EmergencyPayload) {
    this.logger.log(`Emergency OS created: ${payload.orderId}`);

    const nearbyTechs = await this.techRepo
      .createQueryBuilder('t')
      .where('t.company_id = :companyId', { companyId: payload.companyId })
      .andWhere("t.status IN ('online', 'busy')")
      .andWhere(
        `ST_DWithin(t.current_location::geography, ST_MakePoint(:lng, :lat)::geography, 30000)`,
        { lng: payload.lng, lat: payload.lat },
      )
      .orderBy(
        `ST_Distance(t.current_location::geography, ST_MakePoint(${payload.lng}, ${payload.lat})::geography)`,
        'ASC',
      )
      .limit(3)
      .getMany();

    if (!nearbyTechs.length) {
      this.logger.warn(`No nearby technicians for emergency OS ${payload.orderId}`);
      return;
    }

    const bestTech = nearbyTechs[0];
    await this.soRepo.update(payload.orderId, {
      technicianId: bestTech.id,
      status: 'routed',
    });

    await this.recalculateForTechnician(payload.companyId, bestTech.id);
  }

  async recalculateForTechnician(companyId: string, technicianId: string): Promise<void> {
    const start = Date.now();

    const tech = await this.techRepo.findOne({ where: { id: technicianId } });
    if (!tech?.currentLocation) return;

    const coords = await this.redis.geopos(
      `company:${companyId}:technicians`,
      technicianId,
    );
    const [lngStr, latStr] = coords?.[0] ?? [null, null];

    const lat = latStr ? parseFloat(latStr) : 0;
    const lng = lngStr ? parseFloat(lngStr) : 0;

    const pendingOrders = await this.soRepo
      .createQueryBuilder('so')
      .select([
        'so.id', 'so.estimated_duration_minutes', 'so.time_window_start', 'so.time_window_end',
      ])
      .addSelect('ST_Y(so.coordinates::geometry)', 'lat')
      .addSelect('ST_X(so.coordinates::geometry)', 'lng')
      .where('so.technician_id = :technicianId', { technicianId })
      .andWhere("so.status IN ('routed', 'pending')")
      .andWhere('so.company_id = :companyId', { companyId })
      .getRawAndEntities();

    if (!pendingOrders.entities.length) return;

    const waypoints = pendingOrders.entities.map((so, i) => ({
      id: so.id,
      lat: parseFloat(pendingOrders.raw[i]?.lat ?? '0'),
      lng: parseFloat(pendingOrders.raw[i]?.lng ?? '0'),
      estimatedDurationMinutes: so.estimatedDurationMinutes,
      timeWindowStart: so.timeWindowStart,
      timeWindowEnd: so.timeWindowEnd,
    }));

    const origin = { id: 'origin', lat, lng, estimatedDurationMinutes: 0, timeWindowStart: new Date(), timeWindowEnd: new Date() };
    const optimized = await this.engine.optimizeRoute(origin, waypoints);

    for (let i = 0; i < optimized.orderedIds.length; i++) {
      await this.soRepo.update(optimized.orderedIds[i], { sequenceOrder: i + 1, status: 'routed' });
    }

    this.logger.log(
      `Recalculated route for tech ${technicianId}: ${optimized.orderedIds.length} orders in ${Date.now() - start}ms`,
    );
  }
}
