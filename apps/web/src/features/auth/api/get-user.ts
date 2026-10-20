import { queryOptions, useQuery } from '@tanstack/react-query';
import type { UserDto } from '@loan-portal/shared';
import { ApiError, apiClient } from '@/lib/api-client';

export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
};

/** `null` means "no session": a 401 here is an answer, not a failure. */
export async function getUser(): Promise<UserDto | null> {
  try {
    return await apiClient.get<UserDto>('/auth/me', {
      skipUnauthorizedHandler: true,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export const getUserQueryOptions = () =>
  queryOptions({
    queryKey: authKeys.user(),
    queryFn: getUser,
    // The session only changes through login/logout/401, which write the cache directly.
    staleTime: Infinity,
    meta: { skipGlobalErrorHandler: true },
  });

export const useUser = () => useQuery(getUserQueryOptions());
