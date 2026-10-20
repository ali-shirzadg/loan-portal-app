import { ApplicationStatus } from './application-status.enum';

/** List row. NRIC is masked (`******-**-1234`). Dates are ISO 8601 UTC strings. */
export interface ApplicationSummaryDto {
  id: string;
  fullName: string;
  nricMasked: string;
  loanAmount: string;
  tenureMonths: number;
  purposeLabel: string;
  status: ApplicationStatus;
  createdAt: string;
  decidedAt: string | null;
}

/** Detail view. Money is a decimal string; NRIC is the full 12 digits; phone is E.164. */
export interface ApplicationDetailDto {
  id: string;
  fullName: string;
  nric: string;
  phone: string;
  email: string;
  monthlyIncome: string;
  loanAmount: string;
  tenureMonths: number;
  purposeCode: string;
  purposeLabel: string;
  status: ApplicationStatus;
  creditCheckDueAt: string;
  createdAt: string;
  decidedAt: string | null;
}

/** SSE payload sent when an application is decided. */
export interface ApplicationStatusChangedEvent {
  applicationId: string;
  status: ApplicationStatus;
  decidedAt: string | null;
}
