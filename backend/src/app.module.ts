import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { TechniciansModule } from './modules/technicians/technicians.module';
import { ServiceOrdersModule } from './modules/service-orders/service-orders.module';
import { RoutingModule } from './modules/routing/routing.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { LocationGatewayModule } from './gateways/location-gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: config.get<string>('REDIS_URL'),
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DB_URL'),
        autoLoadEntities: true,
        synchronize: false,
        logging: false,
        ssl: { rejectUnauthorized: false },
      }),
    }),
    AuthModule,
    CompaniesModule,
    UsersModule,
    TechniciansModule,
    ServiceOrdersModule,
    RoutingModule,
    NotificationsModule,
    TrackingModule,
    LocationGatewayModule,
  ],
})
export class AppModule {}
