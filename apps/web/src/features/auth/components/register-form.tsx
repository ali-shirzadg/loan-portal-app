import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { RegisterDto, type UserDto } from '@loan-portal/shared';
import { useForm } from 'react-hook-form';
import { FormError } from '@/components/form/form-error';
import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
import { applyApiError, humanizeMessage } from '@/utils/form-errors';
import { useRegister } from '../api/register';

const LABELS = { fullName: 'Full name', email: 'Email', password: 'Password' };

export function RegisterForm({
  onSuccess,
}: {
  onSuccess?: (user: UserDto) => void;
}) {
  const registerUser = useRegister();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterDto>({
    resolver: classValidatorResolver(RegisterDto),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => {
    registerUser.mutate(values, {
      onSuccess,
      onError: (error) =>
        applyApiError(error, setError, LABELS, [
          'fullName',
          'email',
          'password',
        ]),
    });
  });

  const fieldError = (field: keyof RegisterDto) =>
    errors[field]?.message
      ? humanizeMessage(errors[field].message, field, LABELS[field])
      : undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={errors.root?.server?.message} />
      <TextField
        label="Full name"
        autoComplete="name"
        error={fieldError('fullName')}
        {...register('fullName')}
      />
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
        autoComplete="new-password"
        hint="At least 12 characters."
        error={fieldError('password')}
        {...register('password')}
      />
      <Button
        type="submit"
        className="w-full"
        disabled={registerUser.isPending}
      >
        {registerUser.isPending ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  );
}
