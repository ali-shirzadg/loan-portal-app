import type { DataSourceOptions } from 'typeorm';
import { configureFieldEncryption } from '../common/crypto/field-encryption';
import type { EnvironmentVariables } from '../config/env.validation';

type DatabaseConfig = Pick<
  EnvironmentVariables,
  | 'DATABASE_HOST'
  | 'DATABASE_PORT'
  | 'DATABASE_NAME'
  | 'DATABASE_USERNAME'
  | 'DATABASE_PASSWORD'
  | 'FIELD_ENCRYPTION_KEY'
>;

/**
 * Connection options shared by the Nest app and the migration CLI.
 * Entities and migrations are added by each caller (webpack bundling means
 * file globs only work in the CLI). Also keys the encrypted columns, so no
 * connection can read or write them without the key.
 */
export function buildTypeOrmOptions(config: DatabaseConfig) {
  configureFieldEncryption(config.FIELD_ENCRYPTION_KEY);
  return {
    type: 'mysql',
    host: config.DATABASE_HOST,
    port: config.DATABASE_PORT,
    database: config.DATABASE_NAME,
    username: config.DATABASE_USERNAME,
    password: config.DATABASE_PASSWORD,
    charset: 'utf8mb4',
    // mysql2 reads/writes DATETIME as UTC; the server runs in +00:00 too.
    timezone: 'Z',
    synchronize: false,
    migrationsRun: false,
  } satisfies DataSourceOptions;
}
