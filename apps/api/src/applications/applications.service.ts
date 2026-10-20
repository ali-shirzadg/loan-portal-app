import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  ApiErrorBody,
  ApplicationStatus,
  CreateApplicationDto,
  Paginated,
  Role,
  normalizeMyPhone,
  normalizeNric,
  StatusActor,
} from '@loan-portal/shared';
import { DataSource, Repository } from 'typeorm';
import type { AuthUser } from '../common/types/auth-user';
import { isDuplicateKeyError } from '../common/db-errors';
import { normalizeMoney } from '../common/money';
import { CreditCheckScheduler } from '../credit-check/credit-check.scheduler';
import { pickCreditCheckDelayMs } from '../credit-check/credit-check-schedule';
import { LoanPurposesService } from '../loan-purposes/loan-purposes.service';
import { ApplicationStatusEvent } from './application-status-event.entity';
import { LoanApplication } from './loan-application.entity';

export interface PageRequest {
  page: number;
  pageSize: number;
}

/** Newest first; id breaks ties so pages are stable. Matches the (user_id|status, created_at) indexes. */
const NEWEST_FIRST = { createdAt: 'DESC', id: 'DESC' } as const;

/** Columns a list row needs; the wide detail-only columns are not read. */
const SUMMARY_COLUMNS = {
  id: true,
  fullName: true,
  nric: true,
  loanAmount: true,
  tenureMonths: true,
  purposeLabel: true,
  status: true,
  createdAt: true,
  decidedAt: true,
} as const;

export interface CreateResult {
  application: LoanApplication;
  /** False when an Idempotency-Key replay returned the original application. */
  created: boolean;
}

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectRepository(LoanApplication)
    private readonly applications: Repository<LoanApplication>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly purposes: LoanPurposesService,
    private readonly creditCheck: CreditCheckScheduler,
  ) {}

  /** FR-APP-1/3/4, FR-CC-1/2. */
  async create(
    userId: string,
    dto: CreateApplicationDto,
    idempotencyKey?: string,
  ): Promise<CreateResult> {
    if (idempotencyKey) {
      const existing = await this.findByIdempotencyKey(userId, idempotencyKey);
      if (existing) return { application: existing, created: false };
    }

    const purpose = await this.purposes.findByCode(dto.purposeCode);
    if (!purpose) {
      const body: ApiErrorBody = {
        statusCode: 400,
        message: 'Validation failed',
        errors: {
          purposeCode: [
            'purposeCode must be one of the codes returned by GET /loan-purposes',
          ],
        },
      };
      throw new BadRequestException(body);
    }

    const now = new Date();
    const application = this.applications.create({
      userId,
      fullName: dto.fullName,
      nric: normalizeNric(dto.nric),
      phone: normalizeMyPhone(dto.phone),
      email: dto.email.toLowerCase(),
      monthlyIncome: normalizeMoney(dto.monthlyIncome),
      loanAmount: normalizeMoney(dto.loanAmount),
      tenureMonths: dto.tenureMonths,
      purposeCode: purpose.code,
      purposeLabel: purpose.label,
      status: ApplicationStatus.PENDING,
      creditCheckDueAt: new Date(now.getTime() + pickCreditCheckDelayMs()),
      decidedAt: null,
      idempotencyKey: idempotencyKey ?? null,
      createdAt: now,
    });

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(application);
        await manager.save(
          manager.create(ApplicationStatusEvent, {
            applicationId: application.id,
            fromStatus: null,
            toStatus: ApplicationStatus.PENDING,
            actor: StatusActor.CUSTOMER,
            createdAt: now,
          }),
        );
      });
    } catch (error) {
      // Two concurrent requests with the same key: the loser reads the winner's row.
      if (idempotencyKey && isDuplicateKeyError(error)) {
        const existing = await this.findByIdempotencyKey(
          userId,
          idempotencyKey,
        );
        if (existing) return { application: existing, created: false };
      }
      throw error;
    }
    await this.scheduleCreditCheck(application);
    return { application, created: true };
  }

  /** FR-VIEW-1: a customer's own applications. Ownership is part of the WHERE clause. */
  listForCustomer(
    userId: string,
    { page, pageSize }: PageRequest,
  ): Promise<Paginated<LoanApplication>> {
    return this.paginate({ userId }, page, pageSize);
  }

  /** FR-VIEW-3/4: every application, optionally filtered by status. */
  listAll(
    { page, pageSize }: PageRequest,
    status?: ApplicationStatus,
  ): Promise<Paginated<LoanApplication>> {
    return this.paginate(status ? { status } : {}, page, pageSize);
  }

  /**
   * FR-VIEW-2/5: an admin may read any application; a customer only their own.
   * Someone else's id is indistinguishable from a missing one (404, not 403).
   */
  async findOneFor(id: string, user: AuthUser): Promise<LoanApplication> {
    const application = await this.applications.findOneBy(
      user.role === Role.ADMIN ? { id } : { id, userId: user.id },
    );
    if (!application) throw new NotFoundException('Application not found');
    return application;
  }

  private async paginate(
    where: { userId?: string; status?: ApplicationStatus },
    page: number,
    pageSize: number,
  ): Promise<Paginated<LoanApplication>> {
    // Not findAndCount: combined with a partial `select`, its total excluded rows
    // with a NULL selected column (PENDING rows have no decided_at).
    const [items, total] = await Promise.all([
      this.applications.find({
        select: SUMMARY_COLUMNS,
        where,
        order: NEWEST_FIRST,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.applications.count({ where }),
    ]);
    return { items, page, pageSize, total };
  }

  private findByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<LoanApplication | null> {
    return this.applications.findOneBy({ userId, idempotencyKey });
  }

  /**
   * After commit. If Redis is unavailable the application stays PENDING and the
   * boot-time reconciliation (FR-CC-4) enqueues it later; the customer's
   * submission must not fail for that reason.
   */
  private async scheduleCreditCheck(
    application: LoanApplication,
  ): Promise<void> {
    try {
      await this.creditCheck.schedule(
        application.id,
        application.creditCheckDueAt,
      );
    } catch (error) {
      this.logger.error(
        `Could not enqueue credit check for ${application.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
