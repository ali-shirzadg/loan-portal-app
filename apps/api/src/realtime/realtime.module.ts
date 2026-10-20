import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { RealtimeService } from './realtime.service';

@Module({
  imports: [RedisModule],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
