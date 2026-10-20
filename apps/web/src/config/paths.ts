import { Role } from '@loan-portal/shared';

export const paths = {
  home: '/',
  login: '/login',
  register: '/register',
  applications: {
    root: '/applications',
    new: '/applications/new',
    detail: (id: string) => `/applications/${id}`,
  },
  admin: {
    applications: '/admin/applications',
  },
} as const;

/** Where a signed-in user lands: customers on their list, admins on the all-applications view. */
export function landingPath(role: Role): string {
  return role === Role.ADMIN
    ? paths.admin.applications
    : paths.applications.root;
}
