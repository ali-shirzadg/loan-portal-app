import { useNavigate } from 'react-router-dom';
import { QueryError } from '@/components/errors/query-error';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { paths } from '@/config/paths';
import { ApplicationForm } from '@/features/applications/components/application-form';
import { useUser } from '@/features/auth/api/get-user';
import { useLoanPurposes } from '@/features/loan-purposes/api/get-loan-purposes';

function FormSkeleton() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-label="Loading the application form"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
      <Skeleton className="h-10 w-40" />
    </div>
  );
}

export function Component() {
  const navigate = useNavigate();
  const { data: user } = useUser();
  const purposes = useLoanPurposes();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Apply for a personal loan</h1>
      <Card>
        <CardHeader>
          <CardTitle>Application details</CardTitle>
          <CardDescription>All fields are required.</CardDescription>
        </CardHeader>
        <CardContent>
          {purposes.isPending || !user ? <FormSkeleton /> : null}
          {purposes.isError ? (
            <QueryError
              title="Could not load loan purposes"
              message={purposes.error.message}
              onRetry={() => void purposes.refetch()}
            />
          ) : null}
          {purposes.data && user ? (
            <ApplicationForm
              purposes={purposes.data}
              defaultEmail={user.email}
              onCreated={(application) =>
                navigate(paths.applications.detail(application.id))
              }
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
