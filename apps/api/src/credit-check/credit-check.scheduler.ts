import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { CREDIT_CHECK_QUEUE } from './credit-check.constants';
import { buildDecideJob } from './credit-check-job';

/**
 * While Redis is unreachable the client queues commands and retries for
 * minutes; a submission must not wait that long. The reconciler sweep picks
 * up anything that did not make it.
 */
export const ENQUEUE_TIMEOUT_MS = 2_000;

/** Producer side of the credit-check queue. */
@Injectable()
export class CreditCheckScheduler {
  constructor(@InjectQueue(CREDIT_CHECK_QUEUE) private readonly queue: Queue) {}

  /** Rejects after ENQUEUE_TIMEOUT_MS; a late add still lands (same job id, no duplicate). */
  async schedule(applicationId: string, dueAt: Date): Promise<void> {
    const { name, data, opts } = buildDecideJob(applicationId, dueAt);
    const add = this.queue.add(name, data, opts);
    // A failure after the timeout has nobody waiting for it; the sweep covers it.
    add.catch(() => undefined);

    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(new Error(`enqueue timed out after ${ENQUEUE_TIMEOUT_MS}ms`)),
        ENQUEUE_TIMEOUT_MS,
      );
    });
    try {
      await Promise.race([add, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
}
