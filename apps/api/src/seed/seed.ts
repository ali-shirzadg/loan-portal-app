import { performance } from 'node:perf_hooks';
import { Queue } from 'bullmq';
import type { EntityManager, ObjectLiteral } from 'typeorm';
import { ApplicationStatusEvent } from '../applications/application-status-event.entity';
import { LoanApplication } from '../applications/loan-application.entity';
import { PasswordService } from '../auth/password.service';
import { validate } from '../config/env.validation';
import { buildDecideJob } from '../credit-check/credit-check-job';
import { CREDIT_CHECK_QUEUE } from '../credit-check/credit-check.constants';
import dataSource from '../database/data-source';
import { User } from '../users/user.entity';
import { upsertAdmin } from './seed-admin';
import { buildSeedRows, DEMO_CUSTOMER_PASSWORD } from './seed-data';

/** FR-SEED-3: ~1,000 rows per INSERT statement. */
const BATCH_SIZE = 1_000;

async function insertInBatches<T extends ObjectLiteral>(
  manager: EntityManager,
  entity: new () => T,
  rows: T[],
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await manager
      .createQueryBuilder()
      .insert()
      .into(entity)
      .values(rows.slice(i, i + BATCH_SIZE))
      .execute();
  }
}

/**
 * Removes every customer with their applications and status events. The admin
 * account is kept (upsertAdmin has already reset it).
 */
async function wipeCustomerData(manager: EntityManager): Promise<void> {
  await manager.query('DELETE FROM application_status_events');
  await manager.query('DELETE FROM loan_applications');
  await manager.query(`DELETE FROM users WHERE role = 'CUSTOMER'`);
}

async function enqueuePending(pending: LoanApplication[]): Promise<void> {
  const env = validate(process.env);
  const queue = new Queue(CREDIT_CHECK_QUEUE, {
    connection: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
    },
  });
  try {
    const now = new Date();
    await queue.addBulk(
      pending.map((app) => buildDecideJob(app.id, app.creditCheckDueAt, now)),
    );
  } finally {
    await queue.close();
  }
}

async function main(): Promise<void> {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error(
      'Refusing to seed: NODE_ENV is production (the seed deletes all customer data).',
    );
  }
  const started = performance.now();
  await dataSource.initialize();
  try {
    await upsertAdmin();

    // One hash for all seeded customers (FR-SEED-3): hashing 501 passwords would take minutes.
    const passwordHash = await new PasswordService().hash(
      DEMO_CUSTOMER_PASSWORD,
    );
    const rows = buildSeedRows(passwordHash);

    await dataSource.transaction(async (manager) => {
      await wipeCustomerData(manager);
      await insertInBatches(manager, User, rows.users);
      await insertInBatches(manager, LoanApplication, rows.applications);
      await insertInBatches(
        manager,
        ApplicationStatusEvent,
        rows.events as ApplicationStatusEvent[],
      );
    });

    await enqueuePending(rows.pending);

    const seconds = ((performance.now() - started) / 1000).toFixed(1);
    console.log(
      `Seeded ${rows.users.length} customers, ${rows.applications.length} applications ` +
        `(${rows.pending.length} PENDING, enqueued), ${rows.events.length} status events in ${seconds}s`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
