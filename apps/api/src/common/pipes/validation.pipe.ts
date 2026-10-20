import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ApiErrorBody } from '@loan-portal/shared';
import type { ValidationError } from 'class-validator';

function collect(
  errors: ValidationError[],
  prefix: string,
  out: Record<string, string[]>,
): void {
  for (const error of errors) {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    if (error.constraints) out[path] = Object.values(error.constraints);
    if (error.children?.length) collect(error.children, path, out);
  }
}

/** NFR-SEC-1: strict global validation; failures become ApiErrorBody with per-field messages. */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => {
      const fieldErrors: Record<string, string[]> = {};
      collect(errors, '', fieldErrors);
      const body: ApiErrorBody = {
        statusCode: 400,
        message: 'Validation failed',
        errors: fieldErrors,
      };
      return new BadRequestException(body);
    },
  });
}
