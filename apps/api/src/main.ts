import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { configureApp, GLOBAL_PREFIX } from './app/configure-app';
import { setupSwagger } from './app/setup-swagger';
import { Environment, EnvironmentVariables } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  if (config.get('NODE_ENV', { infer: true }) !== Environment.Production) {
    setupSwagger(app);
  }
  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`API running on http://localhost:${port}/${GLOBAL_PREFIX}`);
}

bootstrap();
