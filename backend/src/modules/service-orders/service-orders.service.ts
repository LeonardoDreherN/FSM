import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ServiceOrder } from './entities/service-order.entity';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';

@Injectable()
export class ServiceOrdersService {
  constructor(
    @InjectRepository(ServiceOrder)
    private readonly repo: Repository<ServiceOrder>,
    private readonly events: EventEmitter2,
  ) {}

  async create(companyId: string, dto: CreateServiceOrderDto): Promise<ServiceOrder> {
    const result = await this.repo.query(
      `INSERT INTO service_orders
         (company_id, client_name, client_phone, client_email, address, coordinates,
          priority, service_type, description, estimated_duration_minutes,
          time_window_start, time_window_end, technician_id)
       VALUES ($1,$2,$3,$4,$5, ST_SetSRID(ST_MakePoint($6,$7), 4326),
               $8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        companyId,
        dto.clientName,
        dto.clientPhone,
        dto.clientEmail || null,
        dto.address,
        dto.lng,
        dto.lat,
        dto.priority ?? 'medium',
        dto.serviceType || null,
        dto.description || null,
        dto.estimatedDurationMinutes,
        dto.timeWindowStart,
        dto.timeWindowEnd,
        dto.technicianId || null,
      ],
    );

    const id = result[0].id;

    if (dto.priority === 'emergency') {
      this.events.emit('routing.emergency_os_created', { orderId: id, companyId, lat: dto.lat, lng: dto.lng });
    }

    return this.repo.findOneOrFail({ where: { id }, relations: ['technician'] });
  }

  findByTechnician(companyId: string, technicianId: string, date?: string) {
    const qb = this.repo
      .createQueryBuilder('so')
      .leftJoinAndSelect('so.technician', 'tech')
      .where('so.company_id = :companyId', { companyId })
      .andWhere('so.technician_id = :technicianId', { technicianId })
      .andWhere("so.status NOT IN ('canceled')")
      .orderBy('so.time_window_start', 'ASC');

    if (date) {
      qb.andWhere('DATE(so.time_window_start) = :date', { date });
    }

    return qb.getMany();
  }

  findAll(companyId: string, date?: string) {
    const qb = this.repo
      .createQueryBuilder('so')
      .leftJoinAndSelect('so.technician', 'tech')
      .where('so.company_id = :companyId', { companyId })
      .orderBy('so.time_window_start', 'ASC')
      .addOrderBy('so.sequence_order', 'ASC');

    if (date) {
      qb.andWhere('DATE(so.time_window_start) = :date', { date });
    }

    return qb.getMany();
  }

  async findOne(companyId: string, id: string) {
    const order = await this.repo.findOne({
      where: { id, companyId },
      relations: ['technician'],
    });
    if (!order) throw new NotFoundException('Ordem de serviço não encontrada');
    return order;
  }

  async updateStatus(companyId: string, id: string, status: string): Promise<ServiceOrder> {
    const order = await this.findOne(companyId, id);
    const previous = order.status;
    const patch: Partial<ServiceOrder> = { status };

    if (status === 'in_transit') patch.actualArrivalAt = undefined;
    if (status === 'in_progress') {
      patch.startedAt = new Date();
      patch.actualArrivalAt = new Date();
    }
    if (status === 'completed') {
      patch.completedAt = new Date();
      if (order.startedAt) {
        const diffMs = Date.now() - order.startedAt.getTime();
        patch.actualDurationMinutes = Math.round(diffMs / 60000);
      }
    }

    await this.repo.update(id, patch);
    const updated = await this.repo.findOneOrFail({ where: { id } });

    this.events.emit(`routing.os_status_changed`, {
      orderId: id,
      companyId,
      technicianId: order.technicianId,
      previous,
      current: status,
      order: updated,
    });

    return updated;
  }

  async findPendingNearby(companyId: string, lat: number, lng: number, radiusMeters = 20000) {
    return this.repo
      .createQueryBuilder('so')
      .where('so.company_id = :companyId', { companyId })
      .andWhere("so.status IN ('pending', 'routed')")
      .andWhere(
        `ST_DWithin(so.coordinates::geography, ST_MakePoint(:lng, :lat)::geography, :radius)`,
        { lng, lat, radius: radiusMeters },
      )
      .addSelect(
        `ST_Distance(so.coordinates::geography, ST_MakePoint(:lng2, :lat2)::geography)`,
        'dist_m',
      )
      .setParameter('lng2', lng)
      .setParameter('lat2', lat)
      .orderBy('dist_m', 'ASC')
      .getMany();
  }
}
