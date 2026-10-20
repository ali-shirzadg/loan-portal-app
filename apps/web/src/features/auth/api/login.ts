import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LoginDto, UserDto } from '@loan-portal/shared';
import { apiClient } from '@/lib/api-client';
import { authKeys } from './get-user';

export const login = (input: LoginDto) =>
  apiClient.post<UserDto>('/auth/login', input, {
    skipUnauthorizedHandler: true,
  });

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (user) => queryClient.setQueryData(authKeys.user(), user),
  });
};
