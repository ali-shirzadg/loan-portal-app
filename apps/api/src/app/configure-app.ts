import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { EnvironmentVariables } from '../config/env.validation';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { createValidationPipe } from '../common/pipes/validation.pipe';

export const GLOBAL_PREFIX = 'api';

/** HTTP-level setup shared by main.ts and any test that boots the full app. */
export function configureApp(app: INestApplication): void {
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  app.setGlobalPrefix(GLOBAL_PREFIX);
  // Over plain http (local dev) the default `upgrade-insecure-requests` makes the
  // browser load Swagger UI assets over https, which fails.
  const plainHttp = !config.get('COOKIE_SECURE', { infer: true });
  app.use(
    helmet({
      contentSecurityPolicy: plainHttp
        ? {
            directives: {
              ...helmet.contentSecurityPolicy.getDefaultDirectives(),
              'upgrade-insecure-requests': null,
            },
          }
        : undefined,
    }),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }),
    credentials: true,
  });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
}
