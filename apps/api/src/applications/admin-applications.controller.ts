import { Controller, Get, Query } from '@nestjs/common';
import {
  ApplicationSummaryDto,
  ListApplicationsQueryDto,
  Paginated,
  Role,
} from '@loan-portal/shared';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { APPLICATION_PAGE_SCHEMA } from '../openapi/response-schemas';
import { toSummaryPage } from './application.mapper';
import { ApplicationsService } from './applications.service';

@ApiTags('Admin')
@ApiCookieAuth()
@Roles(Role.ADMIN)
@Controller('admin/applications')
export class AdminApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @ApiOkResponse({ schema: APPLICATION_PAGE_SCHEMA })
  /** FR-VIEW-3/4/6: all applications, filterable by status, paginated. */
  @Get()
  async list(
    @Query() query: ListApplicationsQueryDto,
  ): Promise<Paginated<ApplicationSummaryDto>> {
    return toSummaryPage(await this.applications.listAll(query, query.status));
  }
}
