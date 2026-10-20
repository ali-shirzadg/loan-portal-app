import { randomUUID } from 'node:crypto';
import { faker } from '@faker-js/faker';
import {
  ApplicationStatus,
  LOAN_LIMITS,
  Role,
  StatusActor,
} from '@loan-portal/shared';
import { ApplicationStatusEvent } from '../applications/application-status-event.entity';
import { LoanApplication } from '../applications/loan-application.entity';
import { CREDIT_CHECK_DELAY_MS } from '../credit-check/credit-check-schedule';
import { APPROVAL_PROBABILITY } from '../credit-check/credit-check.constants';
import { LOAN_PURPOSES } from '../loan-purposes/loan-purposes-upstream.client';
import { User } from '../users/user.entity';

export const SEED_EMAIL_DOMAIN = '@loanportal.test';
export const ADMIN_EMAIL = `admin${SEED_EMAIL_DOMAIN}`;
export const DEMO_CUSTOMER_EMAIL = `customer${SEED_EMAIL_DOMAIN}`;
export const DEFAULT_ADMIN_PASSWORD = 'Admin#Passw0rd2026';
export const DEMO_CUSTOMER_PASSWORD = 'Customer#Passw0rd2026';

export const SEED_COUNTS = {
  customers: 500,
  applications: 10_000,
  pending: 20,
  demoPending: 5,
  demoDecided: 12,
} as const;

const FAKER_SEED = 20261020;
const HISTORY_DAYS = 180;
/** Malaysian state codes (01-16) used as the place-of-birth part of the NRIC. */
const PLACE_CODES = Array.from({ length: 16 }, (_, i) =>
  String(i + 1).padStart(2, '0'),
);
/** Second digit of a 01X mobile number that has 9 digits after +60. */
const MOBILE_SECOND_DIGITS = [0, 2, 3, 4, 6, 7, 9];

export interface SeedRows {
  users: User[];
  applications: LoanApplication[];
  events: Partial<ApplicationStatusEvent>[];
  pending: LoanApplication[];
}

/** Integer sen -> "1234.50". */
export function senToMoney(sen: number): string {
  return `${Math.floor(sen / 100)}.${String(sen % 100).padStart(2, '0')}`;
}

/** Synthetic but structurally valid: real birth date, state code, serial. */
export function syntheticNric(): string {
  const birth = faker.date.birthdate({ min: 21, max: 65, mode: 'age' });
  const yymmdd =
    String(birth.getUTCFullYear() % 100).padStart(2, '0') +
    String(birth.getUTCMonth() + 1).padStart(2, '0') +
    String(birth.getUTCDate()).padStart(2, '0');
  const place = faker.helpers.arrayElement(PLACE_CODES);
  const serial = String(faker.number.int({ min: 0, max: 9999 })).padStart(
    4,
    '0',
  );
  return `${yymmdd}${place}${serial}`;
}

export function syntheticPhone(): string {
  const second = faker.helpers.arrayElement(MOBILE_SECOND_DIGITS);
  const rest = String(faker.number.int({ min: 0, max: 9_999_999 })).padStart(
    7,
    '0',
  );
  return `+601${second}${rest}`;
}

interface Applicant {
  user: User;
  nric: string;
  phone: string;
}

function makeApplication(
  applicant: Applicant,
  createdAt: Date,
  dueAt: Date,
  status: ApplicationStatus,
): LoanApplication {
  const purpose = faker.helpers.arrayElement(LOAN_PURPOSES);
  const decided = status !== ApplicationStatus.PENDING;
  return Object.assign(new LoanApplication(), {
    id: randomUUID(),
    userId: applicant.user.id,
    fullName: applicant.user.fullName,
    nric: applicant.nric,
    phone: applicant.phone,
    email: applicant.user.email,
    monthlyIncome: senToMoney(
      faker.number.int({ min: 150_000, max: 3_000_000 }),
    ),
    loanAmount: senToMoney(
      faker.number.int({
        min: LOAN_LIMITS.amount.min * 100,
        max: LOAN_LIMITS.amount.max * 100,
      }),
    ),
    tenureMonths: faker.helpers.arrayElement([12, 24, 36, 48, 60, 72, 84]),
    purposeCode: purpose.code,
    purposeLabel: purpose.label,
    status,
    creditCheckDueAt: dueAt,
    // Decided rows were decided exactly when the credit check fell due.
    decidedAt: decided ? dueAt : null,
    idempotencyKey: null,
    createdAt,
  });
}

function eventsFor(app: LoanApplication): Partial<ApplicationStatusEvent>[] {
  const events: Partial<ApplicationStatusEvent>[] = [
    {
      applicationId: app.id,
      fromStatus: null,
      toStatus: ApplicationStatus.PENDING,
      actor: StatusActor.CUSTOMER,
      createdAt: app.createdAt,
    },
  ];
  if (app.decidedAt) {
    events.push({
      applicationId: app.id,
      fromStatus: ApplicationStatus.PENDING,
      toStatus: app.status,
      actor: StatusActor.SYSTEM,
      createdAt: app.decidedAt,
    });
  }
  return events;
}

/**
 * Builds the whole dataset in memory. Deterministic apart from the clock-relative
 * PENDING rows and the generated UUIDs (faker is seeded).
 */
export function buildSeedRows(
  passwordHash: string,
  now = new Date(),
): SeedRows {
  faker.seed(FAKER_SEED);

  const demo = Object.assign(new User(), {
    id: randomUUID(),
    email: DEMO_CUSTOMER_EMAIL,
    passwordHash,
    fullName: 'Demo Customer',
    role: Role.CUSTOMER,
  });
  const customers = Array.from({ length: SEED_COUNTS.customers }, (_, i) =>
    Object.assign(new User(), {
      id: randomUUID(),
      email: `customer${String(i + 1).padStart(3, '0')}${SEED_EMAIL_DOMAIN}`,
      passwordHash,
      fullName: faker.person.fullName(),
      role: Role.CUSTOMER,
    }),
  );
  const users = [demo, ...customers];
  const applicants: Applicant[] = users.map((user) => ({
    user,
    nric: syntheticNric(),
    phone: syntheticPhone(),
  }));
  const demoApplicant = applicants[0];

  const applications: LoanApplication[] = [];
  const pending: LoanApplication[] = [];

  const addDecided = (applicant: Applicant) => {
    // Ends 5 min before now so no decision lies in the future.
    const refDate = new Date(now.getTime() - CREDIT_CHECK_DELAY_MS.max);
    const createdAt = faker.date.recent({ days: HISTORY_DAYS, refDate });
    const delay = faker.number.int(CREDIT_CHECK_DELAY_MS);
    const dueAt = new Date(createdAt.getTime() + delay);
    const status =
      faker.number.float() < APPROVAL_PROBABILITY
        ? ApplicationStatus.APPROVED
        : ApplicationStatus.REJECTED;
    applications.push(makeApplication(applicant, createdAt, dueAt, status));
  };
  const addPending = (applicant: Applicant) => {
    // Due 10 s to 5 min from now, so the worker visibly decides them.
    const dueAt = new Date(
      now.getTime() + faker.number.int(CREDIT_CHECK_DELAY_MS),
    );
    const submittedBefore = faker.number.int(CREDIT_CHECK_DELAY_MS);
    const createdAt = new Date(
      Math.min(now.getTime() - 1_000, dueAt.getTime() - submittedBefore),
    );
    const app = makeApplication(
      applicant,
      createdAt,
      dueAt,
      ApplicationStatus.PENDING,
    );
    applications.push(app);
    pending.push(app);
  };

  for (let i = 0; i < SEED_COUNTS.demoPending; i++) addPending(demoApplicant);
  for (let i = 0; i < SEED_COUNTS.demoDecided; i++) addDecided(demoApplicant);
  for (let i = SEED_COUNTS.demoPending; i < SEED_COUNTS.pending; i++) {
    addPending(faker.helpers.arrayElement(applicants.slice(1)));
  }
  while (applications.length < SEED_COUNTS.applications) {
    addDecided(faker.helpers.arrayElement(applicants.slice(1)));
  }

  return {
    users,
    applications,
    events: applications.flatMap(eventsFor),
    pending,
  };
}
