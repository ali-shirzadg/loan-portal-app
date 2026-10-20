import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RegisterDto, UserDto } from '@loan-portal/shared';
import { apiClient } from '@/lib/api-client';
import { authKeys } from './get-user';

/** Registration also signs the new customer in. */
export const register = (input: RegisterDto) =>
  apiClient.post<UserDto>('/auth/register', input, {
    skipUnauthorizedHandler: true,
  });

export const useRegister = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: register,
    onSuccess: (user) => queryClient.setQueryData(authKeys.user(), user),
  });
};
