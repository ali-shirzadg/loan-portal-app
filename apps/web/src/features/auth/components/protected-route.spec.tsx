import { Role, type UserDto } from '@loan-portal/shared';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { server } from '@/testing/server';
import { renderWithProviders } from '@/testing/test-utils';
import { ProtectedRoute } from './protected-route';

const customer: UserDto = {
  id: '1',
  email: 'c@example.com',
  fullName: 'Test Customer',
  role: Role.CUSTOMER,
};

function mockSession(user: UserDto | null) {
  server.use(
    http.get('*/api/auth/me', () =>
      user
        ? HttpResponse.json(user)
        : HttpResponse.json(
            { statusCode: 401, message: 'Unauthorized' },
            { status: 401 },
          ),
    ),
  );
}

function renderGuarded(allowedRoles?: Role[]) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<p>Login page</p>} />
      <Route path="/applications" element={<p>Customer landing</p>} />
      <Route path="/admin/applications" element={<p>Admin landing</p>} />
      <Route
        path="/secret"
        element={
          <ProtectedRoute allowedRoles={allowedRoles}>
            <p>Secret content</p>
          </ProtectedRoute>
        }
      />
    </Routes>,
    { initialEntries: ['/secret'] },
  );
}

describe('ProtectedRoute', () => {
  it('redirects an anonymous visitor to the login page', async () => {
    mockSession(null);
    renderGuarded();
    expect(await screen.findByText('Login page')).toBeTruthy();
    expect(screen.queryByText('Secret content')).toBeNull();
  });

  it('renders the page for a signed-in user with an allowed role', async () => {
    mockSession(customer);
    renderGuarded([Role.CUSTOMER]);
    expect(await screen.findByText('Secret content')).toBeTruthy();
  });

  it('sends a user with the wrong role to their own landing page', async () => {
    mockSession(customer);
    renderGuarded([Role.ADMIN]);
    expect(await screen.findByText('Customer landing')).toBeTruthy();
    expect(screen.queryByText('Secret content')).toBeNull();
  });

  it('sends an admin without the customer role to the admin landing page', async () => {
    mockSession({ ...customer, role: Role.ADMIN });
    renderGuarded([Role.CUSTOMER]);
    expect(await screen.findByText('Admin landing')).toBeTruthy();
  });
});
