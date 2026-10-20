import { ApplicationStatus } from '@loan-portal/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<
  ApplicationStatus,
  { label: string; className: string }
> = {
  [ApplicationStatus.PENDING]: {
    label: 'Pending',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  [ApplicationStatus.APPROVED]: {
    label: 'Approved',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  [ApplicationStatus.REJECTED]: {
    label: 'Rejected',
    className: 'border-red-200 bg-red-50 text-red-800',
  },
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const { label, className } = STATUS_STYLE[status];
  return (
    <Badge variant="outline" className={cn('font-medium', className)}>
      {label}
    </Badge>
  );
}
