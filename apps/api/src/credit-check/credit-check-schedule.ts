/** FR-CC-2: the simulated credit check completes 10 s to 5 min after submission. */
export const CREDIT_CHECK_DELAY_MS = { min: 10_000, max: 300_000 } as const;

/** Uniform random delay in [min, max] ms. The RNG is a parameter so tests can fix it. */
export function pickCreditCheckDelayMs(
  random: () => number = Math.random,
): number {
  const { min, max } = CREDIT_CHECK_DELAY_MS;
  return min + Math.floor(random() * (max - min + 1));
}
