import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApplicationStatus } from '@loan-portal/shared';
import { User } from '../users/user.entity';

// CHECK constraints are created in the migration: the TypeORM MySQL driver does not manage them.
@Entity('loan_applications')
@Index('IDX_loan_applications_user_created', ['userId', 'createdAt'])
@Index('IDX_loan_applications_status_created', ['status', 'createdAt'])
@Index('IDX_loan_applications_created', ['createdAt'])
@Index('IDX_loan_applications_status_due', ['status', 'creditCheckDueAt'])
@Index('UQ_loan_applications_user_idempotency', ['userId', 'idempotencyKey'], {
  unique: true,
})
export class LoanApplication {
  @PrimaryColumn({ type: 'char', length: 36 })
  id!: string;

  /** App-side UUID: TypeORM would create a VARCHAR(36) for a generated uuid. */
  @BeforeInsert()
  assignId() {
    this.id ??= randomUUID();
  }

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'full_name', type: 'varchar', length: 100 })
  fullName!: string;

  /** Normalised 12 digits. Never log; mask in lists. */
  @Column({ type: 'char', length: 12 })
  nric!: string;

  /** E.164, e.g. +60123456789. */
  @Column({ type: 'varchar', length: 16 })
  phone!: string;

  @Column({ type: 'varchar', length: 254 })
  email!: string;

  /** DECIMAL(12,2) — kept as string to avoid float error. */
  @Column({ name: 'monthly_income', type: 'decimal', precision: 12, scale: 2 })
  monthlyIncome!: string;

  /** DECIMAL(12,2) — kept as string to avoid float error. */
  @Column({ name: 'loan_amount', type: 'decimal', precision: 12, scale: 2 })
  loanAmount!: string;

  @Column({ name: 'tenure_months', type: 'smallint', unsigned: true })
  tenureMonths!: number;

  @Column({ name: 'purpose_code', type: 'varchar', length: 50 })
  purposeCode!: string;

  /** Label snapshot: purposes come from an upstream service, so no FK. */
  @Column({ name: 'purpose_label', type: 'varchar', length: 100 })
  purposeLabel!: string;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status!: ApplicationStatus;

  @Column({ name: 'credit_check_due_at', type: 'datetime', precision: 3 })
  creditCheckDueAt!: Date;

  @Column({
    name: 'decided_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  decidedAt!: Date | null;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  idempotencyKey!: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
    onUpdate: 'CURRENT_TIMESTAMP(3)',
  })
  updatedAt!: Date;
}
