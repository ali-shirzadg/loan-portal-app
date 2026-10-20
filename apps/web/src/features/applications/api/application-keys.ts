/** Query-key factory for the customer-facing application queries. */
export const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (page: number, pageSize: number) =>
    [...applicationKeys.lists(), { page, pageSize }] as const,
  details: () => [...applicationKeys.all, 'detail'] as const,
  detail: (id: string) => [...applicationKeys.details(), id] as const,
};
