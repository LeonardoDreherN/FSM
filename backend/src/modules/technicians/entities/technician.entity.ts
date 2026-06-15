import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { ServiceOrder } from '../../service-orders/entities/service-order.entity';

@Entity('technicians')
export class Technician {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50 })
  phone: string;

  @Column({ length: 50, default: 'offline' })
  status: string;

  @Column({ name: 'vehicle_type', length: 50, default: 'motorcycle' })
  vehicleType: string;

  @Column({ name: 'current_location', type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  currentLocation: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  heading: number;

  @Column({ name: 'speed_kmh', type: 'numeric', precision: 6, scale: 2, nullable: true })
  speedKmh: number;

  @Column({ name: 'whatsapp_number', length: 50, nullable: true })
  whatsappNumber: string;

  @Column({ name: 'fcm_token', length: 512, nullable: true })
  fcmToken: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Company, (c) => c.technicians)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => ServiceOrder, (so) => so.technician)
  serviceOrders: ServiceOrder[];
}
