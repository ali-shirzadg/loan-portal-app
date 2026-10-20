import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiErrorBody } from '@loan-portal/shared';
import type { Response } from 'express';

/**
 * Every error leaves the API as ApiErrorBody. Unexpected errors are logged
 * server-side (message and stack only, never request bodies) and reach the
 * client as a generic 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') return;
    const response = host.switchToHttp().getResponse<Response>();
    if (response.headersSent) return;

    const body = this.toBody(exception);
    if (body.statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (!(exception instanceof HttpException)) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      };
    }
    const statusCode = exception.getStatus();
    const res = exception.getResponse();
    if (typeof res === 'string') return { statusCode, message: res };

    const { message, errors } = res as {
      message?: string | string[];
      errors?: Record<string, string[]>;
    };
    return {
      statusCode,
      message: Array.isArray(message)
        ? message.join('; ')
        : (message ?? exception.message),
      ...(errors && { errors }),
    };
  }
}
