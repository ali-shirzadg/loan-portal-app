import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Redis } from 'ioredis';
import { DataSource } from 'typeorm';
import { REDIS_CLIENT } from '../redis/redis.tokens';

const CHECK_TIMEOUT_MS = 2_000;

export interface HealthReport {
  status: 'ok';
  checks: { database: 'up'; redis: 'up' };
}

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /** Throws 503 naming the failed dependency; never leaks connection details. */
  async check(): Promise<HealthReport> {
    const [database, redis] = await Promise.allSettled([
      withTimeout(this.dataSource.query('SELECT 1')),
      withTimeout(this.redis.ping()),
    ]);
    const down = [
      database.status === 'rejected' && 'database',
      redis.status === 'rejected' && 'redis',
    ].filter(Boolean);
    if (down.length > 0) {
      throw new ServiceUnavailableException(`Unavailable: ${down.join(', ')}`);
    }
    return { status: 'ok', checks: { database: 'up', redis: 'up' } };
  }
}

function withTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), CHECK_TIMEOUT_MS);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}
