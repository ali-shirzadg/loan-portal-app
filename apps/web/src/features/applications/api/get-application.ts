import { queryOptions, useQuery } from '@tanstack/react-query';
import type { ApplicationDetailDto } from '@loan-portal/shared';
import { apiClient } from '@/lib/api-client';
import { applicationKeys } from './application-keys';

export const getApplication = (id: string) =>
  apiClient.get<ApplicationDetailDto>(
    `/applications/${encodeURIComponent(id)}`,
  );

export const getApplicationQueryOptions = (id: string) =>
  queryOptions({
    queryKey: applicationKeys.detail(id),
    queryFn: () => getApplication(id),
  });

export const useApplication = (id: string) =>
  useQuery(getApplicationQueryOptions(id));
