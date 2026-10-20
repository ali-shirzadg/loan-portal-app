import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { ApplicationStatus } from '@loan-portal/shared';
import type { Queue } from 'bullmq';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { LoanApplication } from '../applications/loan-application.entity';
import { CREDIT_CHECK_QUEUE } from './credit-check.constants';
import { buildDecideJob } from './credit-check-job';

const BATCH_SIZE = 500;
export const SWEEP_INTERVAL_MS = 60_000;
/** A row this far past its due time should have been decided already. */
export const SWEEP_GRACE_MS = 60_000;

/**
 * FR-CC-4 / D1: the database row is the source of truth. On boot, make sure
 * each PENDING application has a job, so a restart, a wiped Redis, or rows
 * inserted by the seed script never leave an application undecided. After
 * that, sweep overdue PENDING rows every minute, so a submission made while
 * Redis was down is picked up once Redis is back, without a restart.
 */
@Injectable()
export class CreditCheckReconciler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(CreditCheckReconciler.name);
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    @InjectRepository(LoanApplication)
    private readonly applications: Repository<LoanApplication>,
    @InjectQueue(CREDIT_CHECK_QUEUE) private readonly queue: Queue,
  ) {}

  /** Runs in the background so a slow scan never delays startup. */
  onApplicationBootstrap(): void {
    void this.run();
    this.timer = setInterval(
      () => void this.run(new Date(Date.now() - SWEEP_GRACE_MS)),
      SWEEP_INTERVAL_MS,
    );
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
  }

  /** Skips a tick while the previous scan is still running (e.g. Redis is down). */
  private async run(dueBefore?: Date): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.reconcile(dueBefore);
    } catch (error) {
      this.logger.error(
        `Reconciliation failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    } finally {
      this.running = false;
    }
  }

  /** Without `dueBefore`, scans every PENDING row; with it, only rows due before then. */
  async reconcile(dueBefore?: Date): Promise<number> {
    let lastId = '';
    let enqueued = 0;
    for (;;) {
      const batch = await this.applications.find({
        select: { id: true, creditCheckDueAt: true },
        where: {
          status: ApplicationStatus.PENDING,
          id: MoreThan(lastId),
          ...(dueBefore && { creditCheckDueAt: LessThan(dueBefore) }),
        },
        order: { id: 'ASC' },
        take: BATCH_SIZE,
      });
      if (batch.length === 0) break;
      lastId = batch[batch.length - 1].id;

      const now = new Date();
      await Promise.all(
        batch.map(async (app) => {
          const existing = await this.queue.getJob(app.id);
          if (!existing) {
            const { name, data, opts } = buildDecideJob(
              app.id,
              app.creditCheckDueAt,
              now,
            );
            await this.queue.add(name, data, opts);
            enqueued++;
          } else if (await existing.isFailed()) {
            // Retries exhausted earlier; the row is still PENDING, so try again.
            await existing.retry();
            enqueued++;
          }
        }),
      );
    }
    if (enqueued > 0)
      this.logger.log(`Re-enqueued ${enqueued} pending applications`);
    return enqueued;
  }
}
