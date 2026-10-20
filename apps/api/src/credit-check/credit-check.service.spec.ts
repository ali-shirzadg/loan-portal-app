import { getDataSourceToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { ApplicationStatus, StatusActor } from '@loan-portal/shared';
import { ApplicationStatusEvent } from '../applications/application-status-event.entity';
import { LoanApplication } from '../applications/loan-application.entity';
import { RealtimeService } from '../realtime/realtime.service';
import {
  APPROVAL_PROBABILITY,
  CREDIT_CHECK_RNG,
} from './credit-check.constants';
import { CreditCheckService } from './credit-check.service';

describe('CreditCheckService', () => {
  const decidedAt = new Date('2026-10-20T05:00:00.000Z');
  const manager = {
    update: jest.fn(),
    insert: jest.fn(),
    findOneByOrFail: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn((work: (m: typeof manager) => Promise<unknown>) =>
      work(manager),
    ),
  };
  const realtime = { publish: jest.fn() };
  let random: jest.Mock;
  let service: CreditCheckService;

  beforeEach(async () => {
    jest.clearAllMocks();
    random = jest.fn().mockReturnValue(0);
    realtime.publish.mockResolvedValue(undefined);
    manager.findOneByOrFail.mockResolvedValue({
      userId: 'user-1',
      status: ApplicationStatus.APPROVED,
      decidedAt,
    });
    const module = await Test.createTestingModule({
      providers: [
        CreditCheckService,
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: RealtimeService, useValue: realtime },
        { provide: CREDIT_CHECK_RNG, useValue: random },
      ],
    }).compile();
    service = module.get(CreditCheckService);
  });

  it('FR-CC-5: decides with a guarded UPDATE ... WHERE status = PENDING', async () => {
    manager.update.mockResolvedValue({ affected: 1 });

    await service.decide('app-1');

    expect(manager.update).toHaveBeenCalledWith(
      LoanApplication,
      { id: 'app-1', status: ApplicationStatus.PENDING },
      expect.objectContaining({
        status: ApplicationStatus.APPROVED,
        decidedAt: expect.any(Function),
      }),
    );
  });

  it('records a SYSTEM audit event and publishes once when the row changed', async () => {
    manager.update.mockResolvedValue({ affected: 1 });

    await expect(service.decide('app-1')).resolves.toBe(true);

    expect(manager.insert).toHaveBeenCalledWith(ApplicationStatusEvent, {
      applicationId: 'app-1',
      fromStatus: ApplicationStatus.PENDING,
      toStatus: ApplicationStatus.APPROVED,
      actor: StatusActor.SYSTEM,
    });
    expect(realtime.publish).toHaveBeenCalledWith('user-1', {
      applicationId: 'app-1',
      status: ApplicationStatus.APPROVED,
      decidedAt: decidedAt.toISOString(),
    });
  });

  it('FR-CC-3/5: a second run changes nothing, so no event and no notification', async () => {
    manager.update
      .mockResolvedValueOnce({ affected: 1 })
      .mockResolvedValueOnce({ affected: 0 });

    await expect(service.decide('app-1')).resolves.toBe(true);
    await expect(service.decide('app-1')).resolves.toBe(false);

    expect(manager.insert).toHaveBeenCalledTimes(1);
    expect(realtime.publish).toHaveBeenCalledTimes(1);
  });

  it('approves below the approval probability and rejects at or above it', async () => {
    manager.update.mockResolvedValue({ affected: 1 });

    random.mockReturnValue(APPROVAL_PROBABILITY - 0.001);
    await service.decide('a');
    random.mockReturnValue(APPROVAL_PROBABILITY);
    await service.decide('b');

    const statuses = manager.update.mock.calls.map(
      (c) => (c[2] as { status: string }).status,
    );
    expect(statuses).toEqual([
      ApplicationStatus.APPROVED,
      ApplicationStatus.REJECTED,
    ]);
  });

  it('a failed notification does not fail the decision', async () => {
    manager.update.mockResolvedValue({ affected: 1 });
    realtime.publish.mockRejectedValue(new Error('redis down'));

    await expect(service.decide('app-1')).resolves.toBe(true);
  });
});
