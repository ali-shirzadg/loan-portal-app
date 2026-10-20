import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { CREDIT_CHECK_QUEUE } from './credit-check.constants';
import { buildDecideJob } from './credit-check-job';

/** Producer side of the credit-check queue. */
@Injectable()
export class CreditCheckScheduler {
  constructor(@InjectQueue(CREDIT_CHECK_QUEUE) private readonly queue: Queue) {}

  async schedule(applicationId: string, dueAt: Date): Promise<void> {
    const { name, data, opts } = buildDecideJob(applicationId, dueAt);
    await this.queue.add(name, data, opts);
  }
}
