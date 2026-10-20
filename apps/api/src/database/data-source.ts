import { AdvancedConsoleLogger, DataSource, type QueryRunner } from 'typeorm';
import { validate } from '../config/env.validation';
import { ApplicationStatusEvent } from '../applications/application-status-event.entity';
import { LoanApplication } from '../applications/loan-application.entity';
import { User } from '../users/user.entity';
import { buildTypeOrmOptions } from './typeorm.config';

// TypeORM 1.x does not read .env on its own. Nx injects it for nx tasks;
// this covers running the CLI directly.
try {
  process.loadEnvFile();
} catch {
  // no .env file: rely on the process environment
}

/**
 * The CLI turns on query logging with parameters, and parameters can hold
 * personal data (a down migration writes decrypted NRICs). This logger prints
 * the SQL only, and skips per-query lines unless asked.
 */
class NoParametersLogger extends AdvancedConsoleLogger {
  override logQuery(query: string, _parameters?: unknown, qr?: QueryRunner) {
    super.logQuery(query, undefined, qr);
  }

  override logQueryError(
    error: string,
    query: string,
    _parameters?: unknown,
    qr?: QueryRunner,
  ) {
    super.logQueryError(error, query, undefined, qr);
  }

  override logQuerySlow(
    time: number,
    query: string,
    _parameters?: unknown,
    qr?: QueryRunner,
  ) {
    super.logQuerySlow(time, query, undefined, qr);
  }
}

/** DataSource for the TypeORM CLI and the seed scripts. The app uses TypeOrmModule instead. */
export default new DataSource({
  ...buildTypeOrmOptions(validate(process.env)),
  logger: new NoParametersLogger(['error', 'warn', 'schema', 'migration']),
  entities: [User, LoanApplication, ApplicationStatusEvent],
  migrations: [`${__dirname}/migrations/*.{ts,js}`],
});
