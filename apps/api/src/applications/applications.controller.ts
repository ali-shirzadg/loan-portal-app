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
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
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
import {
  APPLICATION_DETAIL_SCHEMA,
  APPLICATION_PAGE_SCHEMA,
  ERROR_SCHEMA,
  STATUS_EVENT_SCHEMA,
} from '../openapi/response-schemas';
import { RealtimeService } from '../realtime/realtime.service';
import { ApplicationsService } from './applications.service';
import { IdempotencyKey } from './idempotency-key.decorator';
import { IdempotencyKeyPipe } from './idempotency-key.pipe';

@ApiTags('Applications')
@ApiCookieAuth()
@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applications: ApplicationsService,
    private readonly realtime: RealtimeService,
  ) {}

  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      '1-64 characters: letters, digits, hyphens. Repeating a key returns the original application with 200.',
  })
  @ApiCreatedResponse({
    description: 'New application, status PENDING.',
    schema: APPLICATION_DETAIL_SCHEMA,
  })
  @ApiOkResponse({
    description: 'Idempotency-Key replay: the original application.',
    schema: APPLICATION_DETAIL_SCHEMA,
  })
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
  @ApiProduces('text/event-stream')
  @ApiOkResponse({
    description: 'Server-sent events; heartbeat events every 25 s.',
    schema: STATUS_EVENT_SCHEMA,
  })
  @Sse('events')
  events(@CurrentUser() user: AuthUser): Observable<MessageEvent> {
    return this.realtime.stream(user);
  }

  /** FR-VIEW-1: own applications only (the status filter is admin-only and ignored here). */
  @ApiOkResponse({ schema: APPLICATION_PAGE_SCHEMA })
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
  @ApiOkResponse({ schema: APPLICATION_DETAIL_SCHEMA })
  @ApiNotFoundResponse({
    description: 'Not found, or not yours.',
    schema: ERROR_SCHEMA,
  })
  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApplicationDetailDto> {
    return toDetailDto(await this.applications.findOneFor(id, user));
  }
}
