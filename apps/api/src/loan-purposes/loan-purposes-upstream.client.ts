import { Injectable } from '@nestjs/common';
import type { LoanPurposeDto } from '@loan-portal/shared';

export const UPSTREAM_DELAY_MS = 2000;

export const LOAN_PURPOSES: readonly LoanPurposeDto[] = [
  { code: 'EDUCATION', label: 'Education' },
  { code: 'MEDICAL', label: 'Medical expenses' },
  { code: 'HOME_RENOVATION', label: 'Home renovation' },
  { code: 'WEDDING', label: 'Wedding' },
  { code: 'DEBT_CONSOLIDATION', label: 'Debt consolidation' },
  { code: 'TRAVEL', label: 'Travel' },
  { code: 'VEHICLE_REPAIR', label: 'Vehicle repair' },
  { code: 'OTHER', label: 'Other' },
];

/** Simulated core-banking client. The slow call is part of the brief (FR-LP-2). */
@Injectable()
export class LoanPurposesUpstreamClient {
  async fetchPurposes(): Promise<LoanPurposeDto[]> {
    await new Promise((resolve) => setTimeout(resolve, UPSTREAM_DELAY_MS));
    return LOAN_PURPOSES.map((p) => ({ ...p }));
  }
}
