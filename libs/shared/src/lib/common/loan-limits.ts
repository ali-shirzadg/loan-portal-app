/**
 * Single source of truth for loan bounds. Used by the DTO validators and the
 * database CHECK constraints (migration). Amounts are in RM.
 */
export const LOAN_LIMITS = {
  amount: { min: 1000, max: 150000 },
  tenureMonths: { min: 12, max: 84 },
  monthlyIncomeMax: 10_000_000,
} as const;
