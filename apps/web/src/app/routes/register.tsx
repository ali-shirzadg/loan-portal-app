import { Link } from 'react-router-dom';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { paths } from '@/config/paths';
import { GuestRoute } from '@/features/auth/components/protected-route';
import { RegisterForm } from '@/features/auth/components/register-form';

export function Component() {
  return (
    <GuestRoute>
      <AuthLayout
        title="Create your account"
        description="Register to apply for a personal loan."
        footer={
          <>
            Already registered?{' '}
            <Link
              to={paths.login}
              className="text-foreground font-medium underline"
            >
              Sign in
            </Link>
          </>
        }
      >
        <RegisterForm />
      </AuthLayout>
    </GuestRoute>
  );
}
