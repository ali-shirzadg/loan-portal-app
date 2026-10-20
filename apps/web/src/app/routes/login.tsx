import { Link } from 'react-router-dom';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { paths } from '@/config/paths';
import { LoginForm } from '@/features/auth/components/login-form';
import { GuestRoute } from '@/features/auth/components/protected-route';

export function Component() {
  return (
    <GuestRoute>
      <AuthLayout
        title="Sign in"
        description="Access your loan applications."
        footer={
          <>
            New here?{' '}
            <Link
              to={paths.register}
              className="text-foreground font-medium underline"
            >
              Create an account
            </Link>
          </>
        }
      >
        <LoginForm />
      </AuthLayout>
    </GuestRoute>
  );
}
