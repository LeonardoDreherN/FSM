import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Technician } from '../../technicians/entities/technician.entity';
import { ServiceOrder } from '../../service-orders/entities/service-order.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ length: 50, default: 'starter' })
  plan: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => User, (u) => u.company)
  users: User[];

  @OneToMany(() => Technician, (t) => t.company)
  technicians: Technician[];

  @OneToMany(() => ServiceOrder, (so) => so.company)
  serviceOrders: ServiceOrder[];
}
