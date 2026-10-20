import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  CREDIT_CHECK_QUEUE,
  type DecideJobData,
} from './credit-check.constants';
import { CreditCheckService } from './credit-check.service';

@Processor(CREDIT_CHECK_QUEUE, { concurrency: 10 })
export class CreditCheckProcessor extends WorkerHost {
  constructor(private readonly creditCheck: CreditCheckService) {
    super();
  }

  async process(job: Job<DecideJobData>): Promise<void> {
    await this.creditCheck.decide(job.data.applicationId);
  }
}
