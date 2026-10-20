import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { LoanPurposesController } from './loan-purposes.controller';
import { LoanPurposesUpstreamClient } from './loan-purposes-upstream.client';
import { LoanPurposesService, PURPOSES_TTL_MS } from './loan-purposes.service';

@Module({
  // In-memory store: per instance. Swapping in a Redis store later changes only this line.
  imports: [CacheModule.register({ ttl: PURPOSES_TTL_MS })],
  controllers: [LoanPurposesController],
  providers: [LoanPurposesService, LoanPurposesUpstreamClient],
  exports: [LoanPurposesService],
})
export class LoanPurposesModule {}
