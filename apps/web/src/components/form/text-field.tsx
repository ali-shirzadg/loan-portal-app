import { useId, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type TextFieldProps = Omit<ComponentProps<'input'>, 'prefix'> & {
  label: string;
  error?: string;
  hint?: string;
  /** Static text shown inside the input's left edge, e.g. "RM". */
  prefix?: string;
};

/** Label + input + hint + error, wired together for screen readers. */
export function TextField({
  label,
  error,
  hint,
  prefix,
  id,
  className,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        {prefix ? (
          <span
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm"
          >
            {prefix}
          </span>
        ) : null}
        <Input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(prefix && 'pl-10', className)}
          {...inputProps}
        />
      </div>
      {hint && !error ? (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
