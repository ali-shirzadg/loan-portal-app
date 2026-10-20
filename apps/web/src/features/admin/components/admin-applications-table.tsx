import { Link } from 'react-router-dom';
import { formatRm } from '@loan-portal/shared';
import { QueryError } from '@/components/errors/query-error';
import { PagePagination } from '@/components/page-pagination';
import { StatusBadge } from '@/components/status-badge';
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
import { useAdminApplications } from '../api/get-admin-applications';
import { ADMIN_PAGE_SIZE, useAdminFilters } from '../hooks/use-admin-filters';

export function AdminApplicationsTable() {
  const { status, page, setPage } = useAdminFilters();
  const applications = useAdminApplications({
    status,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  });

  if (applications.isPending) {
    return (
      <div
        className="space-y-2"
        aria-busy="true"
        aria-label="Loading applications"
      >
        {Array.from({ length: 8 }, (_, i) => (
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

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Applicant</TableHead>
              <TableHead className="hidden md:table-cell">NRIC</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="hidden lg:table-cell">Purpose</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-10 text-center"
                >
                  No applications match this filter.
                </TableCell>
              </TableRow>
            ) : (
              items.map((application) => (
                <TableRow key={application.id}>
                  <TableCell>
                    <Link
                      to={paths.applications.detail(application.id)}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {application.fullName}
                    </Link>
                    <div className="text-muted-foreground font-mono text-xs md:hidden">
                      {application.nricMasked}
                    </div>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">
                    {application.nricMasked}
                  </TableCell>
                  <TableCell>
                    {formatRm(application.loanAmount)}
                    <div className="text-muted-foreground text-xs sm:hidden">
                      {formatDate(application.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {application.purposeLabel}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={application.status} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatDate(application.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <PagePagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
      />
    </div>
  );
}
