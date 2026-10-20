import { Controller, Get } from '@nestjs/common';
import type { LoanPurposeDto } from '@loan-portal/shared';
import { LoanPurposesService } from './loan-purposes.service';

@Controller('loan-purposes')
export class LoanPurposesController {
  constructor(private readonly purposes: LoanPurposesService) {}

  @Get()
  findAll(): Promise<LoanPurposeDto[]> {
    return this.purposes.findAll();
  }
}
