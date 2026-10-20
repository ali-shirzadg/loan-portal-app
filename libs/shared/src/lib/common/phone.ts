/**
 * Normalises a Malaysian mobile number to E.164 (`+60…`).
 * Input must already pass `@IsMobilePhone('ms-MY')`
 * (e.g. `012-3456789`, `0123456789`, `60123456789`, `+60123456789`).
 */
export function normalizeMyPhone(value: string): string {
  const digits = value.replace(/[\s-]/g, '').replace(/^\+/, '');
  if (digits.startsWith('60')) return `+${digits}`;
  if (digits.startsWith('0')) return `+60${digits.slice(1)}`;
  return `+60${digits}`;
}
