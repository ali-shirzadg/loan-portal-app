import { Link } from 'react-router-dom';
import { formatRm } from '@loan-portal/shared';
import { PagePagination } from '@/components/page-pagination';
import { QueryError } from '@/components/errors/query-error';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { paths } from '@/config/paths';
import { formatDate } from '@/utils/format';
import { useApplications } from '../api/get-applications';

const PAGE_SIZE = 20;

type ApplicationsListProps = {
  page: number;
  onPageChange: (page: number) => void;
};

export function ApplicationsList({
  page,
  onPageChange,
}: ApplicationsListProps) {
  const applications = useApplications(page, PAGE_SIZE);

  if (applications.isPending) {
    return (
      <div
        className="space-y-2"
        aria-busy="true"
        aria-label="Loading applications"
      >
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (applications.isError) {
    return (
      <QueryError
        message={applications.error.message}
        onRetry={() => void applications.refetch()}
      />
    );
  }

  const { items, total, pageSize } = applications.data;

  if (items.length === 0 && page === 1) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="font-medium">No applications yet</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Apply for a personal loan and track the decision here.
        </p>
        <Button asChild className="mt-4">
          <Link to={paths.applications.new}>Apply for a loan</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loan amount</TableHead>
              <TableHead className="hidden md:table-cell">Purpose</TableHead>
              <TableHead className="hidden sm:table-cell">Tenure</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((application) => (
              <TableRow key={application.id}>
                <TableCell>
                  <Link
                    to={paths.applications.detail(application.id)}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {formatRm(application.loanAmount)}
                  </Link>
                  <div className="text-muted-foreground text-xs md:hidden">
                    {application.purposeLabel}
                    <span className="sm:hidden">
                      {' '}
                      - {formatDate(application.createdAt)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {application.purposeLabel}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {application.tenureMonths} months
                </TableCell>
                <TableCell>
                  <StatusBadge status={application.status} />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {formatDate(application.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <PagePagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
}
