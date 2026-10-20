import { Role } from '@loan-portal/shared';

/** What the JWT guard attaches to the request after verifying the cookie. */
export interface AuthUser {
  id: string;
  role: Role;
}

export interface JwtPayload {
  sub: string;
  role: Role;
}
