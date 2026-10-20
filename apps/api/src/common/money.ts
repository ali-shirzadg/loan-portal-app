import { moneyToSen } from '@loan-portal/shared';

/** "4500.5" -> "4500.50": the canonical form DECIMAL(12,2) returns. Input must already be valid. */
export function normalizeMoney(value: string): string {
  const sen = moneyToSen(value);
  if (sen === null) throw new Error('Invalid money string');
  return `${Math.floor(sen / 100)}.${String(sen % 100).padStart(2, '0')}`;
}
