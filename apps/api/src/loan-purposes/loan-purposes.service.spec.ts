import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test } from '@nestjs/testing';
import { createCache } from 'cache-manager';
import { LoanPurposesUpstreamClient } from './loan-purposes-upstream.client';
import { LoanPurposesService } from './loan-purposes.service';

const PURPOSES = [
  { code: 'TRAVEL', label: 'Travel' },
  { code: 'OTHER', label: 'Other' },
];

describe('LoanPurposesService', () => {
  let service: LoanPurposesService;
  let fetchPurposes: jest.Mock;

  beforeEach(async () => {
    fetchPurposes = jest.fn(
      () => new Promise((resolve) => setTimeout(() => resolve(PURPOSES), 20)),
    );
    const module = await Test.createTestingModule({
      providers: [
        LoanPurposesService,
        { provide: CACHE_MANAGER, useValue: createCache() },
        { provide: LoanPurposesUpstreamClient, useValue: { fetchPurposes } },
      ],
    }).compile();
    service = module.get(LoanPurposesService);
  });

  it('FR-LP-5: 20 parallel cold calls make exactly one upstream call', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => service.findAll()),
    );

    expect(fetchPurposes).toHaveBeenCalledTimes(1);
    for (const result of results) expect(result).toEqual(PURPOSES);
  });

  it('FR-LP-3: a warm call is served from the cache without hitting upstream', async () => {
    await service.findAll();
    fetchPurposes.mockClear();

    await expect(service.findAll()).resolves.toEqual(PURPOSES);
    expect(fetchPurposes).not.toHaveBeenCalled();
  });

  it('retries upstream after a failure instead of caching the error', async () => {
    fetchPurposes.mockRejectedValueOnce(new Error('upstream down'));
    await expect(service.findAll()).rejects.toThrow('upstream down');

    await expect(service.findAll()).resolves.toEqual(PURPOSES);
  });

  it('FR-LP-4: bootstrap warms the cache without blocking', async () => {
    service.onApplicationBootstrap();
    await new Promise((resolve) => setTimeout(resolve, 50));
    fetchPurposes.mockClear();

    await service.findAll();
    expect(fetchPurposes).not.toHaveBeenCalled();
  });

  it('finds a purpose by code', async () => {
    await expect(service.findByCode('TRAVEL')).resolves.toEqual(PURPOSES[0]);
    await expect(service.findByCode('NOPE')).resolves.toBeUndefined();
  });
});
