import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { HealthReport, HealthService } from './health.service';

@ApiTags('Health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @ApiOkResponse({ description: 'Database and Redis are reachable.' })
  @Get()
  check(): Promise<HealthReport> {
    return this.health.check();
  }
}
