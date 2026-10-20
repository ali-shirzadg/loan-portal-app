import {
  Body,
  Controller,
  HttpStatus,
  MessageEvent,
  Post,
  Res,
  Sse,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import {
  ApplicationDetailDto,
  CreateApplicationDto,
  Role,
} from '@loan-portal/shared';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/auth-user';
import { toDetailDto } from './application.mapper';
import { RealtimeService } from '../realtime/realtime.service';
import { ApplicationsService } from './applications.service';
import { IdempotencyKey } from './idempotency-key.decorator';
import { IdempotencyKeyPipe } from './idempotency-key.pipe';

@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applications: ApplicationsService,
    private readonly realtime: RealtimeService,
  ) {}

  /** 201 for a new application, 200 when an Idempotency-Key replay returns the original. */
  @Roles(Role.CUSTOMER)
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateApplicationDto,
    @IdempotencyKey(IdempotencyKeyPipe) idempotencyKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApplicationDetailDto> {
    const { application, created } = await this.applications.create(
      user.id,
      dto,
      idempotencyKey,
    );
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return toDetailDto(application);
  }

  /**
   * FR-RT-1/2: server-sent events. Declared before any `:id` route so that
   * "events" is never parsed as an application id.
   */
  @Sse('events')
  events(@CurrentUser() user: AuthUser): Observable<MessageEvent> {
    return this.realtime.stream(user);
  }
}
