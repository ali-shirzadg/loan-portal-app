import 'reflect-metadata';
import { validate } from './env.validation';

const base = {
  NODE_ENV: 'test',
  PORT: '3000',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '3306',
  DATABASE_NAME: 'db',
  DATABASE_USERNAME: 'user',
  DATABASE_PASSWORD: 'pw',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_PASSWORD: 'pw',
  JWT_SECRET: 'x'.repeat(32),
  JWT_EXPIRES_IN_SECONDS: '3600',
  WEB_ORIGIN: 'http://localhost:4200',
  COOKIE_SECURE: 'false',
};

describe('validate', () => {
  it('parses COOKIE_SECURE="false" as false, not true', () => {
    expect(validate(base).COOKIE_SECURE).toBe(false);
    expect(validate({ ...base, COOKIE_SECURE: 'true' }).COOKIE_SECURE).toBe(
      true,
    );
  });

  it('rejects a COOKIE_SECURE value that is not true/false', () => {
    expect(() => validate({ ...base, COOKIE_SECURE: 'yes' })).toThrow();
  });

  it('rejects a short JWT_SECRET', () => {
    expect(() => validate({ ...base, JWT_SECRET: 'short' })).toThrow();
  });
});
