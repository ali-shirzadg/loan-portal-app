import { ApplicationStatus, Role } from '@loan-portal/shared';
import type { Redis } from 'ioredis';
import { RealtimeService, STATUS_CHANNEL } from './realtime.service';

const event = (applicationId: string) => ({
  applicationId,
  status: ApplicationStatus.APPROVED,
  decidedAt: '2026-10-20T05:00:00.000Z',
});

describe('RealtimeService', () => {
  let onMessage: (channel: string, payload: string) => void;
  const subscriber = {
    on: jest.fn((_name: string, cb: typeof onMessage) => (onMessage = cb)),
    subscribe: jest.fn().mockResolvedValue(1),
  };
  const redis = { publish: jest.fn().mockResolvedValue(1) };
  let service: RealtimeService;

  const deliver = (userId: string, applicationId: string) =>
    onMessage(
      STATUS_CHANNEL,
      JSON.stringify({ userId, event: event(applicationId) }),
    );

  beforeEach(async () => {
    jest.clearAllMocks();
    service = new RealtimeService(
      redis as unknown as Redis,
      subscriber as unknown as Redis,
    );
    await service.onModuleInit();
  });

  it('publishes the event with its owner on the shared channel', async () => {
    await service.publish('user-1', event('app-1'));

    expect(redis.publish).toHaveBeenCalledWith(
      STATUS_CHANNEL,
      JSON.stringify({ userId: 'user-1', event: event('app-1') }),
    );
  });

  it('FR-RT-2: a customer receives only their own events, without the owner id', () => {
    const received: unknown[] = [];
    const sub = service
      .stream({ id: 'user-1', role: Role.CUSTOMER })
      .subscribe((m) => received.push(m.data));

    deliver('user-2', 'someone-elses');
    deliver('user-1', 'mine');
    sub.unsubscribe();

    expect(received).toEqual([event('mine')]);
  });

  it('an admin receives every event', () => {
    const received: unknown[] = [];
    const sub = service
      .stream({ id: 'admin-1', role: Role.ADMIN })
      .subscribe((m) => received.push(m.data));

    deliver('user-2', 'a');
    deliver('user-1', 'b');
    sub.unsubscribe();

    expect(received).toEqual([event('a'), event('b')]);
  });

  it('ignores malformed messages', () => {
    const received: unknown[] = [];
    const sub = service
      .stream({ id: 'admin-1', role: Role.ADMIN })
      .subscribe((m) => received.push(m.data));

    onMessage(STATUS_CHANNEL, 'not json');
    sub.unsubscribe();

    expect(received).toEqual([]);
  });

  it('sends a named heartbeat event so connections stay open', () => {
    jest.useFakeTimers();
    const received: { type?: string }[] = [];
    const sub = service
      .stream({ id: 'user-1', role: Role.CUSTOMER })
      .subscribe((m) => received.push(m));

    jest.advanceTimersByTime(25_000);
    sub.unsubscribe();
    jest.useRealTimers();

    expect(received).toEqual([{ type: 'heartbeat', data: 'ping' }]);
  });
});
