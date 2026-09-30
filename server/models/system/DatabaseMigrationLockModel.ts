export type DatabaseMigrationLockStatus = "active" | "released" | "expired";

export interface DatabaseMigrationLock {
  lockId: string;
  owner: string;
  acquiredAt: string;
  expiresAt: string;
  releasedAt?: string;
  status: DatabaseMigrationLockStatus;
  schemaVersion: number;
}
