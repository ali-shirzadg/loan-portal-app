import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { CREDIT_CHECK_QUEUE } from './credit-check.constants';
import {
  CreditCheckScheduler,
  ENQUEUE_TIMEOUT_MS,
} from './credit-check.scheduler';

describe('CreditCheckScheduler', () => {
  const queue = { add: jest.fn() };
  let scheduler: CreditCheckScheduler;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CreditCheckScheduler,
        { provide: getQueueToken(CREDIT_CHECK_QUEUE), useValue: queue },
      ],
    }).compile();
    scheduler = module.get(CreditCheckScheduler);
  });

  afterEach(() => jest.useRealTimers());

  it('adds one delayed job keyed by the application id', async () => {
    queue.add.mockResolvedValue(undefined);
    await scheduler.schedule('app-1', new Date(Date.now() + 30_000));
    expect(queue.add).toHaveBeenCalledWith(
      'decide',
      { applicationId: 'app-1' },
      expect.objectContaining({ jobId: 'app-1', delay: 30_000 }),
    );
  });

  it('FR-CC-4: gives up waiting when Redis does not answer', async () => {
    queue.add.mockReturnValue(new Promise(() => undefined));
    const scheduled = scheduler.schedule('app-1', new Date());
    const assertion = expect(scheduled).rejects.toThrow('timed out');
    await jest.advanceTimersByTimeAsync(ENQUEUE_TIMEOUT_MS);
    await assertion;
  });
});
