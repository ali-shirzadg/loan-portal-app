export enum ApplicationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** Who caused a status change (audit trail). */
export enum StatusActor {
  CUSTOMER = 'CUSTOMER',
  SYSTEM = 'SYSTEM',
  ADMIN = 'ADMIN',
}
