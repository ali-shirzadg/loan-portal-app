/**
 * Single source of truth for loan bounds. Used by the DTO validators and the
 * database CHECK constraints. Amounts are in RM.
 *
 * Changing a limit requires a NEW migration that alters the matching CHECK
 * constraint (migrations hold literal values and are never edited).
 */
export const LOAN_LIMITS = {
  amount: { min: 1000, max: 150000 },
  tenureMonths: { min: 12, max: 84 },
  monthlyIncomeMax: 10_000_000,
} as const;
