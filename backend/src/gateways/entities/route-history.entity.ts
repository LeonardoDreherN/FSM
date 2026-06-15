import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Technician } from '../../modules/technicians/entities/technician.entity';

@Entity('route_history')
export class RouteHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'technician_id' })
  technicianId: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  location: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  heading: number;

  @Column({ name: 'speed_kmh', type: 'numeric', precision: 6, scale: 2, nullable: true })
  speedKmh: number;

  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt: Date;

  @ManyToOne(() => Technician)
  @JoinColumn({ name: 'technician_id' })
  technician: Technician;
}
