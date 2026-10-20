import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import type { ApplicationSummaryDto, Paginated } from '@loan-portal/shared';
import { apiClient } from '@/lib/api-client';
import { applicationKeys } from './application-keys';

export const getApplications = (page: number, pageSize: number) =>
  apiClient.get<Paginated<ApplicationSummaryDto>>('/applications', {
    params: { page, pageSize },
  });

export const getApplicationsQueryOptions = (page: number, pageSize: number) =>
  queryOptions({
    queryKey: applicationKeys.list(page, pageSize),
    queryFn: () => getApplications(page, pageSize),
    placeholderData: keepPreviousData,
  });

export const useApplications = (page: number, pageSize: number) =>
  useQuery(getApplicationsQueryOptions(page, pageSize));
