import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Technician } from './entities/technician.entity';
import { CreateTechnicianDto } from './dto/create-technician.dto';

@Injectable()
export class TechniciansService {
  constructor(
    @InjectRepository(Technician)
    private readonly repo: Repository<Technician>,
    private readonly events: EventEmitter2,
  ) {}

  create(companyId: string, dto: CreateTechnicianDto) {
    const tech = this.repo.create({ ...dto, companyId });
    return this.repo.save(tech);
  }

  findAll(companyId: string) {
    return this.repo.find({
      where: { companyId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(companyId: string, id: string) {
    const tech = await this.repo.findOne({ where: { id, companyId } });
    if (!tech) throw new NotFoundException('Técnico não encontrado');
    return tech;
  }

  async updateStatus(companyId: string, id: string, status: string) {
    const tech = await this.findOne(companyId, id);
    const previous = tech.status;
    await this.repo.update(id, { status });

    if (previous !== status) {
      this.events.emit('technician.status_changed', { technicianId: id, companyId, previous, current: status });
    }

    return { id, status };
  }

  async findNearbyOnline(companyId: string, lat: number, lng: number, radiusMeters = 30000) {
    return this.repo
      .createQueryBuilder('t')
      .where('t.company_id = :companyId', { companyId })
      .andWhere("t.status IN ('online', 'busy')")
      .andWhere('t.is_active = true')
      .andWhere(
        `ST_DWithin(t.current_location::geography, ST_MakePoint(:lng, :lat)::geography, :radius)`,
        { lng, lat, radius: radiusMeters },
      )
      .addSelect(
        `ST_Distance(t.current_location::geography, ST_MakePoint(:lng2, :lat2)::geography)`,
        'distance_m',
      )
      .setParameter('lng2', lng)
      .setParameter('lat2', lat)
      .orderBy('distance_m', 'ASC')
      .getMany();
  }
}
