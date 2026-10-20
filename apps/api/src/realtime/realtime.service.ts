import {
  Inject,
  Injectable,
  Logger,
  MessageEvent,
  OnModuleInit,
} from '@nestjs/common';
import { ApplicationStatusChangedEvent, Role } from '@loan-portal/shared';
import type { Redis } from 'ioredis';
import { filter, interval, map, merge, Observable, Subject } from 'rxjs';
import type { AuthUser } from '../common/types/auth-user';
import { REDIS_CLIENT, REDIS_SUBSCRIBER } from '../redis/redis.tokens';

export const STATUS_CHANNEL = 'application-status-changed';
export const HEARTBEAT_INTERVAL_MS = 25_000;

/** What travels over Redis: the public event plus the owner, used for filtering only. */
interface StatusMessage {
  userId: string;
  event: ApplicationStatusChangedEvent;
}

/**
 * Fan-out of status changes to SSE clients through Redis pub/sub, so a decision
 * made by any API instance reaches clients connected to any other (FR-RT-1/2).
 */
@Injectable()
export class RealtimeService implements OnModuleInit {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly messages = new Subject<StatusMessage>();

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(REDIS_SUBSCRIBER) private readonly subscriber: Redis,
  ) {}

  async onModuleInit(): Promise<void> {
    this.subscriber.on('message', (_channel: string, payload: string) => {
      try {
        this.messages.next(JSON.parse(payload) as StatusMessage);
      } catch {
        this.logger.warn('Ignoring malformed status message');
      }
    });
    await this.subscriber.subscribe(STATUS_CHANNEL);
  }

  /** Called after the decision is committed. userId is stripped before reaching a client. */
  async publish(
    userId: string,
    event: ApplicationStatusChangedEvent,
  ): Promise<void> {
    const message: StatusMessage = { userId, event };
    await this.redis.publish(STATUS_CHANNEL, JSON.stringify(message));
  }

  /** Customers get their own applications' events; admins get all. */
  stream(user: AuthUser): Observable<MessageEvent> {
    const events = this.messages.pipe(
      filter((m) => user.role === Role.ADMIN || m.userId === user.id),
      map((m): MessageEvent => ({ data: m.event })),
    );
    // A named event is ignored by EventSource.onmessage, so clients never see it.
    const heartbeat = interval(HEARTBEAT_INTERVAL_MS).pipe(
      map((): MessageEvent => ({ type: 'heartbeat', data: 'ping' })),
    );
    return merge(events, heartbeat);
  }
}
