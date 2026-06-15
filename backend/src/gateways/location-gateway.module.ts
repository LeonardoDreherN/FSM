import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationGateway } from './location.gateway';
import { Technician } from '../modules/technicians/entities/technician.entity';
import { RouteHistory } from './entities/route-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Technician, RouteHistory])],
  providers: [LocationGateway],
  exports: [LocationGateway],
})
export class LocationGatewayModule {}
