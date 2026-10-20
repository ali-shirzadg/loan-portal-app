import { AdminApplicationsTable } from '@/features/admin/components/admin-applications-table';
import { StatusFilter } from '@/features/admin/components/status-filter';
import { useAdminFilters } from '@/features/admin/hooks/use-admin-filters';

export function Component() {
  const { status, setStatus } = useAdminFilters();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">All applications</h1>
        <p className="text-muted-foreground text-sm">
          Every customer application, newest first.
        </p>
      </div>
      <StatusFilter value={status} onChange={setStatus} />
      <AdminApplicationsTable />
    </div>
  );
}
