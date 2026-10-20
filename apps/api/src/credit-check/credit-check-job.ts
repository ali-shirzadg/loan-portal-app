import type { JobsOptions } from 'bullmq';
import { DECIDE_JOB, type DecideJobData } from './credit-check.constants';

/**
 * One delayed job per application. The job id is the application id, so adding
 * the same application twice is a no-op (BullMQ ignores an existing id).
 * Shared by the API and the seed script.
 */
export function buildDecideJob(
  applicationId: string,
  dueAt: Date,
  now: Date = new Date(),
): { name: string; data: DecideJobData; opts: JobsOptions } {
  return {
    name: DECIDE_JOB,
    data: { applicationId },
    opts: {
      jobId: applicationId,
      delay: Math.max(0, dueAt.getTime() - now.getTime()),
      attempts: 5,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: { age: 3_600, count: 1_000 },
      removeOnFail: { age: 7 * 24 * 3_600, count: 5_000 },
    },
  };
}
