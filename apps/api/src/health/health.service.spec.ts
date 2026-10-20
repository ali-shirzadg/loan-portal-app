import { ServiceUnavailableException } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { DataSource } from 'typeorm';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const dataSource = { query: jest.fn() };
  const redis = { ping: jest.fn() };
  const service = new HealthService(
    dataSource as unknown as DataSource,
    redis as unknown as Redis,
  );

  beforeEach(() => {
    dataSource.query.mockResolvedValue([{ 1: 1 }]);
    redis.ping.mockResolvedValue('PONG');
  });

  it('reports ok when the database and Redis answer', async () => {
    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'up', redis: 'up' },
    });
  });

  it('answers 503 and names the dependency that is down', async () => {
    redis.ping.mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:6379'));

    const error = await service.check().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as Error).message).toBe('Unavailable: redis');
  });
});
