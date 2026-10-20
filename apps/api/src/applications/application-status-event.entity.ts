import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApplicationStatus, StatusActor } from '@loan-portal/shared';
import { LoanApplication } from './loan-application.entity';

/** Append-only audit trail of status changes. */
@Entity('application_status_events')
@Index('IDX_status_events_application_created', ['applicationId', 'createdAt'])
export class ApplicationStatusEvent {
  /** BIGINT comes back from mysql2 as a string. */
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @Column({ name: 'application_id', type: 'char', length: 36 })
  applicationId!: string;

  @ManyToOne(() => LoanApplication, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'application_id' })
  application?: LoanApplication;

  @Column({
    name: 'from_status',
    type: 'enum',
    enum: ApplicationStatus,
    nullable: true,
  })
  fromStatus!: ApplicationStatus | null;

  @Column({ name: 'to_status', type: 'enum', enum: ApplicationStatus })
  toStatus!: ApplicationStatus;

  @Column({ type: 'enum', enum: StatusActor })
  actor!: StatusActor;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt!: Date;
}
