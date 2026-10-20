import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ApplicationDetailDto,
  CreateApplicationDto,
} from '@loan-portal/shared';
import { apiClient } from '@/lib/api-client';
import { applicationKeys } from './application-keys';

export type CreateApplicationVariables = {
  input: CreateApplicationDto;
  /** One per form attempt, reused when the user re-submits after an error (FR-APP-4). */
  idempotencyKey: string;
};

export const createApplication = ({
  input,
  idempotencyKey,
}: CreateApplicationVariables) =>
  apiClient.post<ApplicationDetailDto>('/applications', input, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });

export const useCreateApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createApplication,
    onSuccess: (created) => {
      queryClient.setQueryData(applicationKeys.detail(created.id), created);
      return queryClient.invalidateQueries({
        queryKey: applicationKeys.lists(),
      });
    },
  });
};
