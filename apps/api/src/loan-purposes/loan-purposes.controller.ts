import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { LoanPurposeDto } from '@loan-portal/shared';
import { LOAN_PURPOSES_SCHEMA } from '../openapi/response-schemas';
import { LoanPurposesService } from './loan-purposes.service';

@ApiTags('Loan purposes')
@ApiCookieAuth()
@Controller('loan-purposes')
export class LoanPurposesController {
  constructor(private readonly purposes: LoanPurposesService) {}

  @ApiOkResponse({ schema: LOAN_PURPOSES_SCHEMA })
  @Get()
  findAll(): Promise<LoanPurposeDto[]> {
    return this.purposes.findAll();
  }
}
