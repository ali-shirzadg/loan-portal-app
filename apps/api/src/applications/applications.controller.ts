import {
  Body,
  Controller,
  Get,
  HttpStatus,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  Sse,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import {
  ApplicationDetailDto,
  ApplicationSummaryDto,
  CreateApplicationDto,
  ListApplicationsQueryDto,
  Paginated,
  Role,
} from '@loan-portal/shared';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/auth-user';
import { toDetailDto, toSummaryPage } from './application.mapper';
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

  /** FR-VIEW-1: own applications only (the status filter is admin-only and ignored here). */
  @Roles(Role.CUSTOMER)
  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListApplicationsQueryDto,
  ): Promise<Paginated<ApplicationSummaryDto>> {
    return toSummaryPage(
      await this.applications.listForCustomer(user.id, query),
    );
  }

  /** FR-VIEW-2/5: the owner or an admin; anyone else gets 404. */
  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApplicationDetailDto> {
    return toDetailDto(await this.applications.findOneFor(id, user));
  }
}
