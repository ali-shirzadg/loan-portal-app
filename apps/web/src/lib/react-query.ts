import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: { skipGlobalErrorHandler?: boolean };
  }
}

const MAX_QUERY_RETRIES = 2;

/** Retry only transient failures (network, 5xx), at most twice. 4xx are final. */
export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) return false;
  return (
    error instanceof ApiError && (error.isNetworkError || error.isServerError)
  );
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.skipGlobalErrorHandler) return;
        // 401 is handled by the auth guard (redirect to login), not a toast.
        if (error instanceof ApiError && error.status === 401) return;
        toast.error(error.message);
      },
    }),
    mutationCache: new MutationCache(),
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
      // Mutations are not idempotent by nature: never retried automatically.
      mutations: { retry: false },
    },
  });
}
