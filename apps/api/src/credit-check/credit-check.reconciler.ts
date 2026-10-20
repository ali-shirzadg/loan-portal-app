import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { ApplicationStatus } from '@loan-portal/shared';
import type { Queue } from 'bullmq';
import { MoreThan, Repository } from 'typeorm';
import { LoanApplication } from '../applications/loan-application.entity';
import { CREDIT_CHECK_QUEUE } from './credit-check.constants';
import { buildDecideJob } from './credit-check-job';

const BATCH_SIZE = 500;

/**
 * FR-CC-4 / D1: the database row is the source of truth. On every boot, make
 * sure each PENDING application has a job, so a restart, a wiped Redis, or
 * rows inserted by the seed script never leave an application undecided.
 */
@Injectable()
export class CreditCheckReconciler implements OnApplicationBootstrap {
  private readonly logger = new Logger(CreditCheckReconciler.name);

  constructor(
    @InjectRepository(LoanApplication)
    private readonly applications: Repository<LoanApplication>,
    @InjectQueue(CREDIT_CHECK_QUEUE) private readonly queue: Queue,
  ) {}

  /** Runs in the background so a slow scan never delays startup. */
  onApplicationBootstrap(): void {
    this.reconcile().catch((error: unknown) =>
      this.logger.error(
        `Reconciliation failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      ),
    );
  }

  async reconcile(): Promise<number> {
    let lastId = '';
    let enqueued = 0;
    for (;;) {
      const batch = await this.applications.find({
        select: { id: true, creditCheckDueAt: true },
        where: { status: ApplicationStatus.PENDING, id: MoreThan(lastId) },
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
