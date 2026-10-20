import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { LoginDto, type UserDto } from '@loan-portal/shared';
import { useForm } from 'react-hook-form';
import { FormError } from '@/components/form/form-error';
import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
import { applyApiError, humanizeMessage } from '@/utils/form-errors';
import { useLogin } from '../api/login';

const LABELS = { email: 'Email', password: 'Password' };

export function LoginForm({
  onSuccess,
}: {
  onSuccess?: (user: UserDto) => void;
}) {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginDto>({
    resolver: classValidatorResolver(LoginDto),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess,
      onError: (error) =>
        applyApiError(error, setError, LABELS, ['email', 'password']),
    });
  });

  const fieldError = (field: keyof LoginDto) =>
    errors[field]?.message
      ? humanizeMessage(errors[field].message, field, LABELS[field])
      : undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={errors.root?.server?.message} />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={fieldError('email')}
        {...register('email')}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        error={fieldError('password')}
        {...register('password')}
      />
      <Button type="submit" className="w-full" disabled={login.isPending}>
        {login.isPending ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
}
