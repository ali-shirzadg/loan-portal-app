import { useEffect, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AppErrorFallback } from '@/components/errors/app-error-fallback';
import { ErrorBoundary } from '@/components/errors/error-boundary';
import { Toaster } from '@/components/ui/sonner';
import { authKeys } from '@/features/auth/api/get-user';
import { setUnauthorizedHandler } from '@/lib/api-client';
import { createQueryClient } from '@/lib/react-query';

export function AppProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  // A 401 on any request means the session is gone: record "no user" and drop
  // the cached data, so the route guards send the visitor to the login page.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      queryClient.setQueryData(authKeys.user(), null);
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== authKeys.all[0],
      });
    });
    return () => setUnauthorizedHandler(undefined);
  }, [queryClient]);

  return (
    <ErrorBoundary fallback={<AppErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-center" richColors />
        {import.meta.env.DEV ? (
          <ReactQueryDevtools buttonPosition="bottom-left" />
        ) : null}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
