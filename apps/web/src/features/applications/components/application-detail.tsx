import {
  ApplicationStatus,
  formatNric,
  formatRm,
  type ApplicationDetailDto,
} from '@loan-portal/shared';
import { Loader2Icon } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/utils/format';

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-3 sm:grid-cols-3 sm:gap-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-sm font-medium break-words sm:col-span-2">
        {children}
      </dd>
    </div>
  );
}

export function ApplicationDetail({
  application,
}: {
  application: ApplicationDetailDto;
}) {
  const pending = application.status === ApplicationStatus.PENDING;

  return (
    <div className="space-y-4">
      {pending ? (
        <Alert>
          <Loader2Icon className="animate-spin" />
          <AlertTitle>Credit check in progress</AlertTitle>
          <AlertDescription>
            We are assessing your application. This page updates by itself as
            soon as a decision is made (expected by{' '}
            {formatDateTime(application.creditCheckDueAt)}).
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-lg">Loan application</CardTitle>
          <StatusBadge status={application.status} />
        </CardHeader>
        <CardContent>
          <dl className="divide-border divide-y">
            <Row label="Loan amount">{formatRm(application.loanAmount)}</Row>
            <Row label="Tenure">{application.tenureMonths} months</Row>
            <Row label="Purpose">{application.purposeLabel}</Row>
            <Row label="Monthly income">
              {formatRm(application.monthlyIncome)}
            </Row>
            <Row label="Full name">{application.fullName}</Row>
            <Row label="NRIC">{formatNric(application.nric)}</Row>
            <Row label="Mobile number">{application.phone}</Row>
            <Row label="Email">{application.email}</Row>
            <Row label="Submitted">{formatDateTime(application.createdAt)}</Row>
            <Row label="Decision">
              {application.decidedAt
                ? formatDateTime(application.decidedAt)
                : 'Awaiting decision'}
            </Row>
            <Row label="Reference">
              <span className="font-mono text-xs">{application.id}</span>
            </Row>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
