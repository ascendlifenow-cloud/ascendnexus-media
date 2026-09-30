export type BackupVerificationStatus = "current" | "stale" | "missing" | "failed" | "archived";

export interface BackupVerificationRecord {
  backupVerificationId: string;
  environment: "local" | "test" | "staging" | "production";
  backupType: "database" | "redis" | "object_storage" | "configuration" | "audit" | "deployment";
  status: BackupVerificationStatus;
  backupReferenceCategory?: string;
  lastBackupAt?: string;
  lastRestoreTestAt?: string;
  encrypted: boolean;
  retentionDays?: number;
  blockingIssues: string[];
  warnings: string[];
  checkedAt: string;
  checkedBy?: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
