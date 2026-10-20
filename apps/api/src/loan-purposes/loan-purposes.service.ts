import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import type { LoanPurposeDto } from '@loan-portal/shared';
import { LoanPurposesUpstreamClient } from './loan-purposes-upstream.client';

export const PURPOSES_CACHE_KEY = 'loan-purposes';
/** FR-LP-3: the list rarely changes. */
export const PURPOSES_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class LoanPurposesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LoanPurposesService.name);
  /** The upstream call currently running, shared by every concurrent cold miss. */
  private inFlight: Promise<LoanPurposeDto[]> | null = null;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly upstream: LoanPurposesUpstreamClient,
  ) {}

  /** FR-LP-4: warm the cache without delaying startup. */
  onApplicationBootstrap(): void {
    this.findAll().catch((error: unknown) =>
      this.logger.warn(
        `Cache warm-up failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      ),
    );
  }

  async findAll(): Promise<LoanPurposeDto[]> {
    const cached = await this.cache.get<LoanPurposeDto[]>(PURPOSES_CACHE_KEY);
    if (cached) return cached;
    // FR-LP-5: single-flight. Assigned synchronously after the miss, so
    // concurrent callers all see the same promise.
    this.inFlight ??= this.load().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  async findByCode(code: string): Promise<LoanPurposeDto | undefined> {
    return (await this.findAll()).find((p) => p.code === code);
  }

  private async load(): Promise<LoanPurposeDto[]> {
    const purposes = await this.upstream.fetchPurposes();
    await this.cache.set(PURPOSES_CACHE_KEY, purposes, PURPOSES_TTL_MS);
    return purposes;
  }
}
