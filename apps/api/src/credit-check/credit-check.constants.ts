export const CREDIT_CHECK_QUEUE = 'credit-check';
export const DECIDE_JOB = 'decide';

/** Chance that the simulated credit check approves (D5: pure random decision). */
export const APPROVAL_PROBABILITY = 0.7;

/** Source of randomness for decisions; provided as a token so tests can fix the outcome. */
export const CREDIT_CHECK_RNG = Symbol('CREDIT_CHECK_RNG');
export type Rng = () => number;

export interface DecideJobData {
  applicationId: string;
}
