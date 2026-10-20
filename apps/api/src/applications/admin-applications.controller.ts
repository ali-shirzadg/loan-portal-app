import { Controller, Get, Query } from '@nestjs/common';
import {
  ApplicationSummaryDto,
  ListApplicationsQueryDto,
  Paginated,
  Role,
} from '@loan-portal/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { toSummaryPage } from './application.mapper';
import { ApplicationsService } from './applications.service';

@Roles(Role.ADMIN)
@Controller('admin/applications')
export class AdminApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  /** FR-VIEW-3/4/6: all applications, filterable by status, paginated. */
  @Get()
  async list(
    @Query() query: ListApplicationsQueryDto,
  ): Promise<Paginated<ApplicationSummaryDto>> {
    return toSummaryPage(await this.applications.listAll(query, query.status));
  }
}
