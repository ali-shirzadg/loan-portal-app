import { killPort } from '@nx/node/utils';
import { createConnection } from 'mysql2/promise';
/* eslint-disable */

/** The suite registers users under this domain (see support/http.ts uniqueEmail). */
const E2E_EMAIL_PATTERN = '%@example.test';

async function deleteE2eUsers(): Promise<void> {
  try {
    process.loadEnvFile();
  } catch {
    // no .env file: rely on the process environment
  }
  const connection = await createConnection({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });
  try {
    const owned = `(SELECT a.id FROM loan_applications a JOIN users u ON u.id = a.user_id WHERE u.email LIKE ? AND u.role = 'CUSTOMER')`;
    await connection.query(
      `DELETE FROM application_status_events WHERE application_id IN ${owned}`,
      [E2E_EMAIL_PATTERN],
    );
    await connection.query(
      `DELETE FROM loan_applications WHERE user_id IN (SELECT id FROM users WHERE email LIKE ? AND role = 'CUSTOMER')`,
      [E2E_EMAIL_PATTERN],
    );
    await connection.query(
      `DELETE FROM users WHERE email LIKE ? AND role = 'CUSTOMER'`,
      [E2E_EMAIL_PATTERN],
    );
  } finally {
    await connection.end();
  }
}

module.exports = async function () {
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  // Stop the API first so the credit-check worker cannot write while rows are deleted.
  await killPort(port);
  await deleteE2eUsers();
  console.log(globalThis.__TEARDOWN_MESSAGE__);
};
