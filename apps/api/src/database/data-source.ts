import { DataSource } from 'typeorm';
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

/** DataSource for the TypeORM CLI only. The app uses TypeOrmModule instead. */
export default new DataSource({
  ...buildTypeOrmOptions(validate(process.env)),
  entities: [User, LoanApplication, ApplicationStatusEvent],
  migrations: [`${__dirname}/migrations/*.{ts,js}`],
});
