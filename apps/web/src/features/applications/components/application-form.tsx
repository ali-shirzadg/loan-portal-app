import { useRef } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import {
  CreateApplicationDto,
  LOAN_LIMITS,
  formatRm,
  type ApplicationDetailDto,
  type LoanPurposeDto,
} from '@loan-portal/shared';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FormError } from '@/components/form/form-error';
import { SelectField } from '@/components/form/select-field';
import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
import { applyApiError, humanizeMessage } from '@/utils/form-errors';
import { useCreateApplication } from '../api/create-application';

const LABELS: Record<keyof CreateApplicationDto, string> = {
  fullName: 'Full name',
  nric: 'NRIC',
  phone: 'Mobile number',
  email: 'Email',
  monthlyIncome: 'Monthly income',
  loanAmount: 'Loan amount',
  tenureMonths: 'Tenure',
  purposeCode: 'Loan purpose',
};
const FIELDS = Object.keys(LABELS);

type ApplicationFormProps = {
  /** Loan purposes, already loaded (the route renders a skeleton until then). */
  purposes: LoanPurposeDto[];
  /** Account email; editable because the contact email may differ (FR-APP-5). */
  defaultEmail: string;
  onCreated: (application: ApplicationDetailDto) => void;
};

export function ApplicationForm({
  purposes,
  defaultEmail,
  onCreated,
}: ApplicationFormProps) {
  const create = useCreateApplication();
  // One key per form attempt; reused if the user re-submits after an error, so a
  // request that did reach the server cannot create a second application.
  const idempotencyKey = useRef(crypto.randomUUID());

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateApplicationDto>({
    resolver: classValidatorResolver(CreateApplicationDto),
    defaultValues: {
      fullName: '',
      nric: '',
      phone: '',
      email: defaultEmail,
      monthlyIncome: '',
      loanAmount: '',
      purposeCode: '',
    },
  });

  const onSubmit = handleSubmit((input) => {
    create.mutate(
      { input, idempotencyKey: idempotencyKey.current },
      {
        onSuccess: (application) => {
          toast.success(
            'Application submitted. Your credit check is under way.',
          );
          onCreated(application);
        },
        onError: (error) => applyApiError(error, setError, LABELS, FIELDS),
      },
    );
  });

  const fieldError = (field: keyof CreateApplicationDto) => {
    const message = errors[field]?.message;
    return message ? humanizeMessage(message, field, LABELS[field]) : undefined;
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <FormError message={errors.root?.server?.message} />

      <fieldset className="space-y-4">
        <legend className="mb-2 text-base font-semibold">Applicant</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Full name"
            autoComplete="name"
            error={fieldError('fullName')}
            {...register('fullName')}
          />
          <TextField
            label="NRIC"
            inputMode="numeric"
            placeholder="900101-14-1234"
            hint="YYMMDD-PB-#### or 12 digits."
            error={fieldError('nric')}
            {...register('nric')}
          />
          <TextField
            label="Mobile number"
            type="tel"
            autoComplete="tel"
            placeholder="012-3456789"
            error={fieldError('phone')}
            {...register('phone')}
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            error={fieldError('email')}
            {...register('email')}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-base font-semibold">Financing</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Monthly income"
            prefix="RM"
            inputMode="decimal"
            placeholder="4,500.00"
            error={fieldError('monthlyIncome')}
            {...register('monthlyIncome')}
          />
          <TextField
            label="Loan amount"
            prefix="RM"
            inputMode="decimal"
            placeholder="25000.00"
            hint={`${formatRm(String(LOAN_LIMITS.amount.min))} to ${formatRm(String(LOAN_LIMITS.amount.max))}.`}
            error={fieldError('loanAmount')}
            {...register('loanAmount')}
          />
          <TextField
            label="Tenure (months)"
            type="number"
            inputMode="numeric"
            min={LOAN_LIMITS.tenureMonths.min}
            max={LOAN_LIMITS.tenureMonths.max}
            step={1}
            hint={`${LOAN_LIMITS.tenureMonths.min} to ${LOAN_LIMITS.tenureMonths.max} months.`}
            error={fieldError('tenureMonths')}
            {...register('tenureMonths', { valueAsNumber: true })}
          />
          <SelectField
            label="Loan purpose"
            placeholder="Select a purpose"
            options={purposes.map((p) => ({ value: p.code, label: p.label }))}
            error={fieldError('purposeCode')}
            {...register('purposeCode')}
          />
        </div>
      </fieldset>

      <Button
        type="submit"
        size="lg"
        className="w-full sm:w-auto"
        disabled={create.isPending}
      >
        {create.isPending ? 'Submitting...' : 'Submit application'}
      </Button>
    </form>
  );
}
