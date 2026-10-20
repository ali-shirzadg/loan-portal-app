import { Role } from '@loan-portal/shared';
import { PasswordService } from '../auth/password.service';
import dataSource from '../database/data-source';
import { User } from '../users/user.entity';
import { ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } from './seed-data';

/**
 * Creates the admin account, or resets it when it exists (FR-AUTH-4).
 * Dev defaults are documented in the README; override with
 * SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (never commit real credentials).
 */
export async function upsertAdmin(): Promise<User> {
  const email = (process.env['SEED_ADMIN_EMAIL'] ?? ADMIN_EMAIL).toLowerCase();
  const password = process.env['SEED_ADMIN_PASSWORD'] ?? DEFAULT_ADMIN_PASSWORD;
  const passwordHash = await new PasswordService().hash(password);

  const users = dataSource.getRepository(User);
  const existing = await users.findOneBy({ email });
  const admin = users.create({
    ...existing,
    email,
    passwordHash,
    fullName: existing?.fullName ?? 'Loan Portal Admin',
    role: Role.ADMIN,
  });
  return users.save(admin);
}

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    const admin = await upsertAdmin();
    console.log(`Admin ready: ${admin.email}`);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
