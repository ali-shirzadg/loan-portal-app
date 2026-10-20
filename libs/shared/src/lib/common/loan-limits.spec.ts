import { LOAN_LIMITS } from './loan-limits';

describe('LOAN_LIMITS', () => {
  it('has consistent ranges', () => {
    expect(LOAN_LIMITS.amount.min).toBeLessThan(LOAN_LIMITS.amount.max);
    expect(LOAN_LIMITS.tenureMonths.min).toBeLessThan(
      LOAN_LIMITS.tenureMonths.max,
    );
    expect(LOAN_LIMITS.monthlyIncomeMax).toBeGreaterThan(0);
  });
});
