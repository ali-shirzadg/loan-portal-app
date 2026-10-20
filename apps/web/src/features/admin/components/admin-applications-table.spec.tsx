import {
  ApplicationStatus,
  type ApplicationSummaryDto,
} from '@loan-portal/shared';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/testing/server';
import { renderWithProviders } from '@/testing/test-utils';
import { AdminApplicationsTable } from './admin-applications-table';

const row: ApplicationSummaryDto = {
  id: 'app-1',
  fullName: 'Test Person',
  nricMasked: '******-**-1234',
  loanAmount: '150000.00',
  tenureMonths: 60,
  purposeLabel: 'Education',
  status: ApplicationStatus.APPROVED,
  createdAt: '2026-10-20T10:00:00.000Z',
  decidedAt: '2026-10-20T10:00:30.000Z',
};

describe('AdminApplicationsTable', () => {
  it('requests the status and page from the URL and renders the rows', async () => {
    const seen: Record<string, string> = {};
    server.use(
      http.get('*/api/admin/applications', ({ request }) => {
        new URL(request.url).searchParams.forEach(
          (value, key) => (seen[key] = value),
        );
        return HttpResponse.json({
          items: [row],
          page: 2,
          pageSize: 20,
          total: 21,
        });
      }),
    );

    renderWithProviders(<AdminApplicationsTable />, {
      initialEntries: ['/admin/applications?status=APPROVED&page=2'],
    });

    expect(await screen.findByText('Test Person')).toBeTruthy();
    expect(seen).toEqual({ status: 'APPROVED', page: '2', pageSize: '20' });
    expect(screen.getAllByText('******-**-1234').length).toBeGreaterThan(0);
    expect(screen.getByText('RM150,000.00')).toBeTruthy();
    expect(screen.getByText('Page 2 of 2')).toBeTruthy();
  });

  it('omits the status parameter for "All" and ignores unknown values', async () => {
    let query = '';
    server.use(
      http.get('*/api/admin/applications', ({ request }) => {
        query = new URL(request.url).search;
        return HttpResponse.json({
          items: [],
          page: 1,
          pageSize: 20,
          total: 0,
        });
      }),
    );

    renderWithProviders(<AdminApplicationsTable />, {
      initialEntries: ['/admin/applications?status=NONSENSE&page=-3'],
    });

    expect(
      await screen.findByText('No applications match this filter.'),
    ).toBeTruthy();
    expect(query).toBe('?page=1&pageSize=20');
  });
});
