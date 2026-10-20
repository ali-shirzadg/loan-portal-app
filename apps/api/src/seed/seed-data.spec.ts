import {
  ApplicationStatus,
  isMalaysianNric,
  LOAN_LIMITS,
  moneyToSen,
  MONEY_PATTERN,
} from '@loan-portal/shared';
import { isMobilePhone } from 'class-validator';
import { buildSeedRows, SEED_COUNTS } from './seed-data';

describe('buildSeedRows (FR-SEED-1/4/5)', () => {
  const now = new Date('2026-10-20T05:00:00.000Z');
  const rows = buildSeedRows('hash', now);

  it('creates 10,000 applications across the customers', () => {
    expect(rows.applications).toHaveLength(SEED_COUNTS.applications);
    expect(rows.users).toHaveLength(SEED_COUNTS.customers + 1);
    expect(
      new Set(rows.applications.map((a) => a.userId)).size,
    ).toBeGreaterThan(400);
  });

  it('uses valid synthetic NRICs and Malaysian mobile numbers', () => {
    for (const app of rows.applications.slice(0, 500)) {
      expect(isMalaysianNric(app.nric)).toBe(true);
      expect(app.nric).toMatch(/^\d{12}$/);
      expect(isMobilePhone(app.phone, 'ms-MY')).toBe(true);
    }
  });

  it('keeps amounts and tenures within the loan limits', () => {
    for (const app of rows.applications) {
      expect(app.loanAmount).toMatch(MONEY_PATTERN);
      const sen = moneyToSen(app.loanAmount) as number;
      expect(sen).toBeGreaterThanOrEqual(LOAN_LIMITS.amount.min * 100);
      expect(sen).toBeLessThanOrEqual(LOAN_LIMITS.amount.max * 100);
      expect(app.tenureMonths).toBeGreaterThanOrEqual(
        LOAN_LIMITS.tenureMonths.min,
      );
      expect(app.tenureMonths).toBeLessThanOrEqual(
        LOAN_LIMITS.tenureMonths.max,
      );
    }
  });

  it('keeps status, decided_at and events consistent', () => {
    const eventCounts = new Map<string, number>();
    for (const e of rows.events) {
      eventCounts.set(
        e.applicationId as string,
        (eventCounts.get(e.applicationId as string) ?? 0) + 1,
      );
    }
    for (const app of rows.applications) {
      const pending = app.status === ApplicationStatus.PENDING;
      expect(app.decidedAt === null).toBe(pending);
      expect(eventCounts.get(app.id)).toBe(pending ? 1 : 2);
      if (app.decidedAt) {
        expect(app.decidedAt.getTime()).toBeGreaterThanOrEqual(
          app.createdAt.getTime(),
        );
        expect(app.decidedAt.getTime()).toBeLessThanOrEqual(now.getTime());
      }
    }
  });

  it('leaves ~20 PENDING rows due 10 s to 5 min from now, several on the demo customer', () => {
    expect(rows.pending).toHaveLength(SEED_COUNTS.pending);
    for (const app of rows.pending) {
      const untilDue = app.creditCheckDueAt.getTime() - now.getTime();
      expect(untilDue).toBeGreaterThanOrEqual(10_000);
      expect(untilDue).toBeLessThanOrEqual(300_000);
      expect(app.createdAt.getTime()).toBeLessThan(now.getTime());
    }
    const demoId = rows.users[0].id;
    expect(rows.pending.filter((a) => a.userId === demoId)).toHaveLength(
      SEED_COUNTS.demoPending,
    );
  });
});
