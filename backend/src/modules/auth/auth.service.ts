import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { Technician } from '../technicians/entities/technician.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Technician)
    private readonly techRepo: Repository<Technician>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({
      where: { email: dto.email, isActive: true },
      relations: ['company'],
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.usersRepo.update(user.id, { lastLoginAt: new Date() });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: { id: user.company.id, name: user.company.name },
      },
    };
  }

  async technicianLogin(phone: string) {
    const normalize = (p: string) => p.replace(/\D/g, '');
    const all = await this.techRepo.find({ where: { isActive: true } });
    const tech = all.find(t => normalize(t.phone) === normalize(phone));

    if (!tech) throw new UnauthorizedException('Telefone não encontrado. Verifique com seu gestor.');

    const payload = {
      sub: tech.id,
      role: 'technician',
      companyId: tech.companyId,
      technicianId: tech.id,
      name: tech.name,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      technician: {
        id: tech.id,
        name: tech.name,
        phone: tech.phone,
        vehicleType: tech.vehicleType,
        companyId: tech.companyId,
      },
    };
  }
}
