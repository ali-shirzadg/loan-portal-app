import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  ApplicationStatus,
  ApplicationStatusChangedEvent,
  StatusActor,
} from '@loan-portal/shared';
import { DataSource } from 'typeorm';
import { ApplicationStatusEvent } from '../applications/application-status-event.entity';
import { LoanApplication } from '../applications/loan-application.entity';
import { RealtimeService } from '../realtime/realtime.service';
import {
  APPROVAL_PROBABILITY,
  CREDIT_CHECK_RNG,
  type Rng,
} from './credit-check.constants';

interface Decision {
  userId: string;
  event: ApplicationStatusChangedEvent;
}

@Injectable()
export class CreditCheckService {
  private readonly logger = new Logger(CreditCheckService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly realtime: RealtimeService,
    @Inject(CREDIT_CHECK_RNG) private readonly random: Rng,
  ) {}

  /**
   * FR-CC-3/5: decides a PENDING application exactly once. The guarded UPDATE is
   * the arbiter: if another worker or a retry got there first, zero rows match,
   * and neither the audit event nor the notification is produced.
   * Returns true when this call made the decision.
   */
  async decide(applicationId: string): Promise<boolean> {
    const status =
      this.random() < APPROVAL_PROBABILITY
        ? ApplicationStatus.APPROVED
        : ApplicationStatus.REJECTED;

    const decision = await this.dataSource.transaction(
      async (manager): Promise<Decision | null> => {
        const result = await manager.update(
          LoanApplication,
          { id: applicationId, status: ApplicationStatus.PENDING },
          { status, decidedAt: () => 'NOW(3)' },
        );
        if (result.affected !== 1) return null;

        await manager.insert(ApplicationStatusEvent, {
          applicationId,
          fromStatus: ApplicationStatus.PENDING,
          toStatus: status,
          actor: StatusActor.SYSTEM,
        });
        const decided = await manager.findOneByOrFail(LoanApplication, {
          id: applicationId,
        });
        return {
          userId: decided.userId,
          event: {
            applicationId,
            status: decided.status,
            decidedAt: decided.decidedAt?.toISOString() ?? null,
          },
        };
      },
    );
    if (!decision) return false;

    // After commit. A failed notification must not fail the job: the decision is
    // already durable and a retry would be a no-op; clients refetch on reconnect.
    try {
      await this.realtime.publish(decision.userId, decision.event);
    } catch (error) {
      this.logger.warn(
        `Could not publish status change: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
    return true;
  }
}
