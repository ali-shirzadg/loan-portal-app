import {
  ApplicationStatus,
  type ApplicationDetailDto,
} from '@loan-portal/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/testing/server';
import { renderWithProviders } from '@/testing/test-utils';
import { ApplicationForm } from './application-form';

const purposes = [
  { code: 'HOME_RENOVATION', label: 'Home renovation' },
  { code: 'EDUCATION', label: 'Education' },
];

const created: ApplicationDetailDto = {
  id: 'app-1',
  fullName: 'Test Person',
  nric: '900101141234',
  phone: '+60123456789',
  email: 'account@example.com',
  monthlyIncome: '4500.50',
  loanAmount: '25000.00',
  tenureMonths: 36,
  purposeCode: 'HOME_RENOVATION',
  purposeLabel: 'Home renovation',
  status: ApplicationStatus.PENDING,
  creditCheckDueAt: '2026-10-20T10:00:30.000Z',
  createdAt: '2026-10-20T10:00:00.000Z',
  decidedAt: null,
};

function setup(onCreated = vi.fn()) {
  renderWithProviders(
    <ApplicationForm
      purposes={purposes}
      defaultEmail="account@example.com"
      onCreated={onCreated}
    />,
  );
  return { onCreated };
}

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

function fillValid(
  overrides: Partial<Record<'nric' | 'loanAmount', string>> = {},
) {
  type('Full name', 'Test Person');
  type('NRIC', overrides.nric ?? '900101-14-1234');
  type('Mobile number', '012-3456789');
  type('Monthly income', '4500.50');
  type('Loan amount', overrides.loanAmount ?? '25000');
  type(/Tenure/, '36');
  type('Loan purpose', 'HOME_RENOVATION');
}

const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

describe('ApplicationForm', () => {
  it('pre-fills the email from the account', () => {
    setup();
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe(
      'account@example.com',
    );
  });

  it('shows the shared-DTO validation errors for a bad NRIC and an amount above RM150,000 (FR-APP-2)', async () => {
    setup();
    fillValid({ nric: '901301-14-1234', loanAmount: '150000.01' });

    submit();

    const nricError = await screen.findByText(
      /NRIC must be a valid Malaysian NRIC/,
    );
    expect(nricError.getAttribute('role')).toBe('alert');
    expect(
      screen.getByText(
        /Loan amount must be an amount between RM1,000.00 and RM150,000.00/,
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('NRIC').getAttribute('aria-invalid')).toBe(
      'true',
    );
  });

  it('requires every field before anything is sent', async () => {
    setup(); // no API handler registered: a request would fail the test

    submit();

    expect(
      await screen.findByText(
        /Full name must be longer than or equal to 2 characters/,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/Loan purpose should not be empty/)).toBeTruthy();
    expect(screen.getByText(/Tenure must/)).toBeTruthy();
  });

  it('disables the submit button while the request is pending, then reports the new application', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.post('*/api/applications', async () => {
        await gate;
        return HttpResponse.json(created, { status: 201 });
      }),
    );
    const { onCreated } = setup();
    fillValid();

    submit();

    const button = await screen.findByRole('button', { name: /submitting/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);

    release();
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
  });

  it('shows server-side field errors on the matching inputs', async () => {
    server.use(
      http.post('*/api/applications', () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'Validation failed',
            errors: {
              purposeCode: ['purposeCode is not a known loan purpose'],
            },
          },
          { status: 400 },
        ),
      ),
    );
    setup();
    fillValid();

    submit();

    expect(
      await screen.findByText('Loan purpose is not a known loan purpose'),
    ).toBeTruthy();
  });

  it('reuses the same Idempotency-Key when re-submitting after an error (FR-APP-4)', async () => {
    const keys: (string | null)[] = [];
    let attempt = 0;
    server.use(
      http.post('*/api/applications', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        attempt += 1;
        return attempt === 1
          ? HttpResponse.json(
              { statusCode: 503, message: 'Try later' },
              { status: 503 },
            )
          : HttpResponse.json(created, { status: 201 });
      }),
    );
    const { onCreated } = setup();
    fillValid();

    submit();
    expect(await screen.findByText('Try later')).toBeTruthy();
    submit();
    await waitFor(() => expect(onCreated).toHaveBeenCalled());

    expect(attempt).toBe(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });
});
