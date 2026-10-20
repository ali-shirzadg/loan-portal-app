import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ACCESS_TOKEN_COOKIE } from '../common/guards/jwt-auth.guard';

/** Interactive API docs at /api/docs. Not mounted in production. */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Loan Application Portal API')
    .setDescription(
      'Sign in with POST /api/auth/login first; the access_token cookie it sets authenticates the other calls.',
    )
    .setVersion('1.0')
    .addCookieAuth(ACCESS_TOKEN_COOKIE)
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, config),
    {
      jsonDocumentUrl: 'api/docs-json',
    },
  );
}
