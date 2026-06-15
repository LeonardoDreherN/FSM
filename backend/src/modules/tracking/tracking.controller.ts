import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';

@ApiTags('Tracking (público)')
@Controller('tracking')
export class TrackingController {
  constructor(
    @InjectRepository(ServiceOrder)
    private readonly soRepo: Repository<ServiceOrder>,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  @Get(':token')
  @ApiOperation({ summary: 'Dados públicos de tracking para o cliente final' })
  async getTrackingData(@Param('token') token: string) {
    const order = await this.soRepo.findOne({
      where: { trackingToken: token },
      relations: ['technician'],
    });

    if (!order) throw new NotFoundException('Link de rastreamento inválido');

    let techLocation: { lat: number; lng: number } | null = null;

    if (order.technicianId && order.status === 'in_transit') {
      const pos = await this.redis.geopos(
        `company:${order.companyId}:technicians`,
        order.technicianId,
      );
      if (pos?.[0]) {
        techLocation = { lng: parseFloat(pos[0][0]), lat: parseFloat(pos[0][1]) };
      }
    }

    return {
      status: order.status,
      clientName: order.clientName,
      address: order.address,
      scheduledArrivalAt: order.scheduledArrivalAt,
      technician: order.technician
        ? { name: order.technician.name, vehicleType: order.technician.vehicleType }
        : null,
      technicianLocation: techLocation,
      completedAt: order.completedAt,
    };
  }
}
