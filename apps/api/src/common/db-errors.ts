/** True for MySQL duplicate-key violations (UNIQUE index), as surfaced by TypeORM's QueryFailedError. */
export function isDuplicateKeyError(error: unknown): boolean {
  const driverError = (error as { driverError?: { code?: string } } | null)
    ?.driverError;
  return driverError?.code === 'ER_DUP_ENTRY';
}
