import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Technician } from './entities/technician.entity';
import { TechniciansService } from './technicians.service';
import { TechniciansController } from './technicians.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Technician])],
  controllers: [TechniciansController],
  providers: [TechniciansService],
  exports: [TechniciansService, TypeOrmModule],
})
export class TechniciansModule {}
