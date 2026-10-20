import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import type {
  ApplicationStatus,
  ApplicationSummaryDto,
  Paginated,
} from '@loan-portal/shared';
import { apiClient } from '@/lib/api-client';

export type AdminApplicationsFilters = {
  status?: ApplicationStatus;
  page: number;
  pageSize: number;
};

export const adminKeys = {
  all: ['admin', 'applications'] as const,
  list: (filters: AdminApplicationsFilters) =>
    [...adminKeys.all, filters] as const,
};

export const getAdminApplications = ({
  status,
  page,
  pageSize,
}: AdminApplicationsFilters) =>
  apiClient.get<Paginated<ApplicationSummaryDto>>('/admin/applications', {
    params: { status, page, pageSize },
  });

export const getAdminApplicationsQueryOptions = (
  filters: AdminApplicationsFilters,
) =>
  queryOptions({
    queryKey: adminKeys.list(filters),
    queryFn: () => getAdminApplications(filters),
    placeholderData: keepPreviousData,
  });

export const useAdminApplications = (filters: AdminApplicationsFilters) =>
  useQuery(getAdminApplicationsQueryOptions(filters));
