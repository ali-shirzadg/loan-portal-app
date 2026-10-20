import { queryOptions, useQuery } from '@tanstack/react-query';
import type { LoanPurposeDto } from '@loan-portal/shared';
import { apiClient } from '@/lib/api-client';

export const loanPurposeKeys = {
  all: ['loan-purposes'] as const,
};

export const getLoanPurposes = () =>
  apiClient.get<LoanPurposeDto[]>('/loan-purposes');

export const getLoanPurposesQueryOptions = () =>
  queryOptions({
    queryKey: loanPurposeKeys.all,
    queryFn: getLoanPurposes,
    // FR-LP-6: the list rarely changes and the cold upstream is slow (~2 s).
    staleTime: Infinity,
  });

export const useLoanPurposes = () => useQuery(getLoanPurposesQueryOptions());
