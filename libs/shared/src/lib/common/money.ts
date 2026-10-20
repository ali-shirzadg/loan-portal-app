import { registerDecorator, ValidationOptions } from 'class-validator';

/** Amounts travel as strings: up to 10 integer digits and 2 decimals. */
export const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

/**
 * Converts a money string to integer sen (1 RM = 100 sen) without float
 * arithmetic. Returns null when the string is not a valid amount.
 */
export function moneyToSen(value: string): number | null {
  if (!MONEY_PATTERN.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** Formats a money string for display, always with 2 decimals (no currency symbol). */
export function formatMoney(value: string): string {
  const sen = moneyToSen(value);
  if (sen === null) return value;
  const whole = Math.floor(sen / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${whole}.${String(sen % 100).padStart(2, '0')}`;
}

/**
 * The value must be a money string within [min, max] (RM, inclusive).
 * The comparison is done in integer sen, so there is no float error.
 */
export function IsMoneyInRange(
  min: number,
  max: number,
  validationOptions?: ValidationOptions,
) {
  const minSen = Math.round(min * 100);
  const maxSen = Math.round(max * 100);
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isMoneyInRange',
      target: object.constructor,
      propertyName,
      constraints: [min, max],
      options: {
        message: `${propertyName} must be an amount between ${min} and ${max}`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          const sen = moneyToSen(value);
          return sen !== null && sen >= minSen && sen <= maxSen;
        },
      },
    });
  };
}
