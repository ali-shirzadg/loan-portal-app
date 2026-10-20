import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApplicationStatus } from '@loan-portal/shared';

export const ADMIN_PAGE_SIZE = 20;

function parseStatus(value: string | null): ApplicationStatus | undefined {
  return Object.values(ApplicationStatus).find((status) => status === value);
}

function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** Status filter and page live in the URL, so a filtered view can be shared and survives reload. */
export function useAdminFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const status = parseStatus(searchParams.get('status'));
  const page = parsePage(searchParams.get('page'));

  const setStatus = useCallback(
    (next: ApplicationStatus | undefined) => {
      // A new filter always starts from page 1.
      setSearchParams(next ? { status: next } : {});
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (next: number) => {
      setSearchParams((current) => {
        const params = new URLSearchParams(current);
        params.set('page', String(next));
        return params;
      });
    },
    [setSearchParams],
  );

  return { status, page, setStatus, setPage };
}
