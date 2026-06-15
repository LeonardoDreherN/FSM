import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutingService } from './routing.service';
import { RoutingEngine } from './routing.engine';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { Technician } from '../technicians/entities/technician.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceOrder, Technician]),
    NotificationsModule,
  ],
  providers: [RoutingService, RoutingEngine],
  exports: [RoutingService],
})
export class RoutingModule {}
