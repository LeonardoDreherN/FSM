import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingController } from './tracking.controller';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceOrder])],
  controllers: [TrackingController],
})
export class TrackingModule {}
