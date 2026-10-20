import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/lib/api-client';

/**
 * Validation messages read "<property> must ...". Swap the property name for a
 * human label so the same shared-DTO message works in the UI.
 */
export function humanizeMessage(
  message: string,
  field: string,
  label: string | undefined,
): string {
  if (!label || !message.startsWith(field)) return message;
  return `${label}${message.slice(field.length)}`;
}

/**
 * Maps an `ApiError` onto the form: per-field messages from a 400 go to their
 * inputs, anything else lands in `root.server` for the form-level alert.
 */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  labels: Partial<Record<string, string>> = {},
  knownFields: readonly string[] = [],
): void {
  if (!(error instanceof ApiError)) {
    setError('root.server', {
      message: 'Something went wrong. Please try again.',
    });
    return;
  }
  const entries = Object.entries(error.fieldErrors ?? {}).filter(
    ([field, messages]) =>
      messages.length > 0 &&
      (knownFields.length === 0 || knownFields.includes(field)),
  );
  if (entries.length === 0) {
    setError('root.server', { message: error.message });
    return;
  }
  for (const [field, messages] of entries) {
    setError(field as Path<T>, {
      type: 'server',
      message: humanizeMessage(messages[0], field, labels[field]),
    });
  }
}
