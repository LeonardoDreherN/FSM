import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { Technician } from '../../technicians/entities/technician.entity';

@Entity('service_orders')
export class ServiceOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ name: 'technician_id', nullable: true })
  technicianId: string;

  @Column({ name: 'client_name', length: 255 })
  clientName: string;

  @Column({ name: 'client_phone', length: 50 })
  clientPhone: string;

  @Column({ name: 'client_email', length: 255, nullable: true })
  clientEmail: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  coordinates: string;

  @Column({ length: 50, default: 'pending' })
  status: string;

  @Column({ length: 50, default: 'medium' })
  priority: string;

  @Column({ name: 'service_type', length: 100, nullable: true })
  serviceType: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'estimated_duration_minutes', default: 60 })
  estimatedDurationMinutes: number;

  @Column({ name: 'actual_duration_minutes', nullable: true })
  actualDurationMinutes: number;

  @Column({ name: 'time_window_start', type: 'timestamptz' })
  timeWindowStart: Date;

  @Column({ name: 'time_window_end', type: 'timestamptz' })
  timeWindowEnd: Date;

  @Column({ name: 'sequence_order', nullable: true })
  sequenceOrder: number;

  @Column({ name: 'scheduled_arrival_at', type: 'timestamptz', nullable: true })
  scheduledArrivalAt: Date;

  @Column({ name: 'actual_arrival_at', type: 'timestamptz', nullable: true })
  actualArrivalAt: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ name: 'tracking_token', length: 64, unique: true, nullable: true })
  trackingToken: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company, (c) => c.serviceOrders)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Technician, (t) => t.serviceOrders, { nullable: true })
  @JoinColumn({ name: 'technician_id' })
  technician: Technician;
}
