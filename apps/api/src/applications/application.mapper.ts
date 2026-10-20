import {
  ApplicationDetailDto,
  ApplicationSummaryDto,
  maskNric,
  Paginated,
} from '@loan-portal/shared';
import type { LoanApplication } from './loan-application.entity';

export function toSummaryDto(app: LoanApplication): ApplicationSummaryDto {
  return {
    id: app.id,
    fullName: app.fullName,
    nricMasked: maskNric(app.nric),
    loanAmount: app.loanAmount,
    tenureMonths: app.tenureMonths,
    purposeLabel: app.purposeLabel,
    status: app.status,
    createdAt: app.createdAt.toISOString(),
    decidedAt: app.decidedAt?.toISOString() ?? null,
  };
}

export function toDetailDto(app: LoanApplication): ApplicationDetailDto {
  return {
    id: app.id,
    fullName: app.fullName,
    nric: app.nric,
    phone: app.phone,
    email: app.email,
    monthlyIncome: app.monthlyIncome,
    loanAmount: app.loanAmount,
    tenureMonths: app.tenureMonths,
    purposeCode: app.purposeCode,
    purposeLabel: app.purposeLabel,
    status: app.status,
    creditCheckDueAt: app.creditCheckDueAt.toISOString(),
    createdAt: app.createdAt.toISOString(),
    decidedAt: app.decidedAt?.toISOString() ?? null,
  };
}

export function toSummaryPage(
  page: Paginated<LoanApplication>,
): Paginated<ApplicationSummaryDto> {
  return { ...page, items: page.items.map(toSummaryDto) };
}
