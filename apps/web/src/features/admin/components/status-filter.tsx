import { ApplicationStatus } from '@loan-portal/shared';
import { Button } from '@/components/ui/button';

const OPTIONS: { label: string; value: ApplicationStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: ApplicationStatus.PENDING },
  { label: 'Approved', value: ApplicationStatus.APPROVED },
  { label: 'Rejected', value: ApplicationStatus.REJECTED },
];

type StatusFilterProps = {
  value: ApplicationStatus | undefined;
  onChange: (value: ApplicationStatus | undefined) => void;
};

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filter by status"
      className="flex flex-wrap gap-2"
    >
      {OPTIONS.map((option) => (
        <Button
          key={option.label}
          type="button"
          size="sm"
          variant={option.value === value ? 'default' : 'outline'}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
