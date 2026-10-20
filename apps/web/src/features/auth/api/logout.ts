import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { authKeys } from './get-user';

export const logout = () =>
  apiClient.postVoid('/auth/logout', undefined, {
    skipUnauthorizedHandler: true,
  });

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      // Drop everything cached for this user, then record "no session".
      queryClient.clear();
      queryClient.setQueryData(authKeys.user(), null);
    },
  });
};
