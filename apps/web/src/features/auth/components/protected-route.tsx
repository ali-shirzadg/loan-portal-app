import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Role } from '@loan-portal/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { landingPath, paths } from '@/config/paths';
import { useUser } from '../api/get-user';

function FullPageSkeleton() {
  return (
    <div
      className="mx-auto max-w-5xl space-y-4 p-6"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

type ProtectedRouteProps = {
  /** Roles allowed to see the page. Omit to allow any signed-in user. */
  allowedRoles?: Role[];
  children: ReactNode;
};

/** Sends anonymous users to login (remembering where they were) and wrong-role users home. */
export function ProtectedRoute({
  allowedRoles,
  children,
}: ProtectedRouteProps) {
  const user = useUser();
  const location = useLocation();

  if (user.isPending) return <FullPageSkeleton />;
  if (user.isError) {
    return (
      <div role="alert" className="p-6 text-center text-sm">
        Could not check your session. Please reload the page.
      </div>
    );
  }
  if (!user.data) {
    return (
      <Navigate
        to={paths.login}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  if (allowedRoles && !allowedRoles.includes(user.data.role)) {
    return <Navigate to={landingPath(user.data.role)} replace />;
  }
  return children;
}

/** Login / register pages: signed-in users are bounced to their landing page. */
export function GuestRoute({ children }: { children: ReactNode }) {
  const user = useUser();
  const location = useLocation();
  const from: unknown = location.state?.from;

  if (user.isPending) return <FullPageSkeleton />;
  if (user.data) {
    const target =
      typeof from === 'string' ? from : landingPath(user.data.role);
    return <Navigate to={target} replace />;
  }
  return children;
}
