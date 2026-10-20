import { registerDecorator, ValidationOptions } from 'class-validator';

const NRIC_DASHED = /^(\d{6})-(\d{2})-(\d{4})$/;
const NRIC_PLAIN = /^\d{12}$/;

function isRealDate(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/** The two-digit year is ambiguous, so the date may be valid in either century. */
function isValidBirthDate(yymmdd: string): boolean {
  const yy = Number(yymmdd.slice(0, 2));
  const month = Number(yymmdd.slice(2, 4));
  const day = Number(yymmdd.slice(4, 6));
  return isRealDate(1900 + yy, month, day) || isRealDate(2000 + yy, month, day);
}

/** Accepts `YYMMDD-PB-####` or 12 digits, with a real calendar date in the first 6 digits. */
export function isMalaysianNric(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (!NRIC_DASHED.test(value) && !NRIC_PLAIN.test(value)) return false;
  return isValidBirthDate(value.slice(0, 6));
}

/** `900101-14-1234` -> `900101141234` (12 digits). Input must already be valid. */
export function normalizeNric(value: string): string {
  return value.replace(/-/g, '');
}

/** `900101141234` or `900101-14-1234` -> `******-**-1234`. */
export function maskNric(value: string): string {
  return `******-**-${normalizeNric(value).slice(-4)}`;
}

/** `900101145678` -> `900101-14-5678`. Input must already be a valid 12-digit NRIC. */
export function formatNric(value: string): string {
  const digits = normalizeNric(value);
  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

export function IsMalaysianNric(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isMalaysianNric',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be a valid Malaysian NRIC (YYMMDD-PB-#### or 12 digits)`,
        ...validationOptions,
      },
      validator: {
        validate: isMalaysianNric,
      },
    });
  };
}
