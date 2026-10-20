import { Navigate } from 'react-router-dom';
import { landingPath } from '@/config/paths';
import { useUser } from '@/features/auth/api/get-user';

/** `/` sends each role to its landing page. The layout above guarantees a user exists. */
export function Component() {
  const { data: user } = useUser();
  return user ? <Navigate to={landingPath(user.role)} replace /> : null;
}
