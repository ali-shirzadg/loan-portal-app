import { getQueueToken } from '@nestjs/bullmq';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { ApplicationStatus } from '@loan-portal/shared';
import { LessThan, MoreThan } from 'typeorm';
import { LoanApplication } from '../applications/loan-application.entity';
import { CREDIT_CHECK_QUEUE, DECIDE_JOB } from './credit-check.constants';
import {
  CreditCheckReconciler,
  SWEEP_GRACE_MS,
  SWEEP_INTERVAL_MS,
} from './credit-check.reconciler';

describe('CreditCheckReconciler', () => {
  const now = new Date('2026-10-20T05:00:00.000Z');
  const row = {
    id: 'app-1',
    creditCheckDueAt: new Date(now.getTime() - 120_000),
  };
  const applications = { find: jest.fn() };
  const queue = { getJob: jest.fn(), add: jest.fn() };
  let reconciler: CreditCheckReconciler;

  beforeEach(async () => {
    jest.useFakeTimers({ now });
    jest.clearAllMocks();
    applications.find.mockResolvedValueOnce([row]).mockResolvedValue([]);
    queue.getJob.mockResolvedValue(undefined);
    queue.add.mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      providers: [
        CreditCheckReconciler,
        {
          provide: getRepositoryToken(LoanApplication),
          useValue: applications,
        },
        { provide: getQueueToken(CREDIT_CHECK_QUEUE), useValue: queue },
      ],
    }).compile();
    reconciler = module.get(CreditCheckReconciler);
  });

  afterEach(() => {
    reconciler.onApplicationShutdown();
    jest.useRealTimers();
  });

  it('FR-CC-4: enqueues a PENDING row that has no job', async () => {
    await expect(reconciler.reconcile()).resolves.toBe(1);
    expect(queue.add).toHaveBeenCalledWith(
      DECIDE_JOB,
      { applicationId: 'app-1' },
      expect.objectContaining({ jobId: 'app-1', delay: 0 }),
    );
  });

  it('FR-CC-4: leaves a row alone when its job is still scheduled', async () => {
    queue.getJob.mockResolvedValue({ isFailed: () => Promise.resolve(false) });
    await expect(reconciler.reconcile()).resolves.toBe(0);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('FR-CC-4: retries a job whose attempts ran out', async () => {
    const retry = jest.fn().mockResolvedValue(undefined);
    queue.getJob.mockResolvedValue({
      isFailed: () => Promise.resolve(true),
      retry,
    });
    await expect(reconciler.reconcile()).resolves.toBe(1);
    expect(retry).toHaveBeenCalled();
  });

  it('FR-CC-4: scans all PENDING rows on boot, then only overdue ones every minute', async () => {
    reconciler.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(0);
    expect(applications.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: ApplicationStatus.PENDING, id: MoreThan('') },
      }),
    );

    applications.find.mockClear();
    await jest.advanceTimersByTimeAsync(SWEEP_INTERVAL_MS);
    expect(applications.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: ApplicationStatus.PENDING,
          id: MoreThan(''),
          creditCheckDueAt: LessThan(
            new Date(now.getTime() + SWEEP_INTERVAL_MS - SWEEP_GRACE_MS),
          ),
        },
      }),
    );
  });

  it('FR-CC-4: skips a sweep while the previous scan is still running', async () => {
    applications.find.mockReset().mockReturnValue(new Promise(() => undefined));
    reconciler.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(SWEEP_INTERVAL_MS * 3);
    expect(applications.find).toHaveBeenCalledTimes(1);
  });
});
