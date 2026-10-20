import { useMemo } from 'react';
import {
  Outlet,
  RouterProvider,
  createBrowserRouter,
  type RouteObject,
} from 'react-router-dom';
import { Role } from '@loan-portal/shared';
import { AppErrorFallback } from '@/components/errors/app-error-fallback';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { AppLayout } from './app-layout';

/** Each route module exports `Component`; React Router loads it on first visit. */
const lazyRoute =
  (load: () => Promise<{ Component: React.ComponentType }>) => async () => ({
    Component: (await load()).Component,
  });

const roleGate = (roles: Role[]) => (
  <ProtectedRoute allowedRoles={roles}>
    <Outlet />
  </ProtectedRoute>
);

const ROUTER_FUTURE = { v7_relativeSplatPath: true } as const;

export const routes: RouteObject[] = [
  { path: '/login', lazy: lazyRoute(() => import('./routes/login')) },
  { path: '/register', lazy: lazyRoute(() => import('./routes/register')) },
  {
    // Everything below needs a signed-in user.
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <AppErrorFallback />,
    children: [
      { index: true, lazy: lazyRoute(() => import('./routes/home')) },
      {
        element: roleGate([Role.CUSTOMER]),
        children: [
          {
            path: 'applications',
            lazy: lazyRoute(() => import('./routes/applications/applications')),
          },
          {
            path: 'applications/new',
            lazy: lazyRoute(
              () => import('./routes/applications/new-application'),
            ),
          },
        ],
      },
      {
        // Customers see their own, admins any (the API enforces ownership).
        path: 'applications/:id',
        lazy: lazyRoute(() => import('./routes/applications/application')),
      },
      {
        element: roleGate([Role.ADMIN]),
        children: [
          {
            path: 'admin/applications',
            lazy: lazyRoute(() => import('./routes/admin/applications')),
          },
        ],
      },
      { path: '*', lazy: lazyRoute(() => import('./routes/not-found')) },
    ],
  },
];

export function AppRouter() {
  const router = useMemo(
    () => createBrowserRouter(routes, { future: ROUTER_FUTURE }),
    [],
  );
  return (
    <RouterProvider router={router} future={{ v7_startTransition: true }} />
  );
}
