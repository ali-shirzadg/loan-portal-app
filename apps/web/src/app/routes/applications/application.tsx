import { ArrowLeftIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Role } from '@loan-portal/shared';
import { QueryError } from '@/components/errors/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { landingPath } from '@/config/paths';
import { useApplication } from '@/features/applications/api/get-application';
import { ApplicationDetail } from '@/features/applications/components/application-detail';
import { useUser } from '@/features/auth/api/get-user';
import { ApiError } from '@/lib/api-client';

function DetailBody({ id }: { id: string }) {
  const application = useApplication(id);

  if (application.isPending) {
    return (
      <div
        className="space-y-3"
        aria-busy="true"
        aria-label="Loading application"
      >
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (application.isError) {
    const notFound =
      application.error instanceof ApiError && application.error.status === 404;
    return (
      <QueryError
        title={
          notFound ? 'Application not found' : 'Could not load the application'
        }
        message={
          notFound
            ? 'It does not exist or you do not have access to it.'
            : application.error.message
        }
        onRetry={notFound ? undefined : () => void application.refetch()}
      />
    );
  }
  return <ApplicationDetail application={application.data} />;
}

export function Component() {
  const { id } = useParams();
  const { data: user } = useUser();
  const backTo = landingPath(user?.role ?? Role.CUSTOMER);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        to={backTo}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        Back to applications
      </Link>
      {id ? <DetailBody id={id} /> : null}
    </div>
  );
}
