export type DatabaseMigrationStatus = "pending" | "running" | "completed" | "failed" | "rolled_back";

export interface DatabaseMigrationRecord {
  migrationId: string;
  name: string;
  version: number;
  checksum?: string;
  status: DatabaseMigrationStatus;
  startedAt: string;
  completedAt?: string;
  failedAt?: string;
  appliedBy?: string;
  error?: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
