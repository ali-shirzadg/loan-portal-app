import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ApiErrorBody } from '@loan-portal/shared';

const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{1,64}$/;

/** Validates the optional `Idempotency-Key` header (FR-APP-4). */
@Injectable()
export class IdempotencyKeyPipe
  implements PipeTransform<string | undefined, string | undefined>
{
  transform(value: string | undefined): string | undefined {
    if (value === undefined) return undefined;
    if (!IDEMPOTENCY_KEY.test(value)) {
      const body: ApiErrorBody = {
        statusCode: 400,
        message: 'Validation failed',
        errors: {
          idempotencyKey: [
            'Idempotency-Key must be 1-64 characters: letters, digits and hyphens',
          ],
        },
      };
      throw new BadRequestException(body);
    }
    return value;
  }
}
