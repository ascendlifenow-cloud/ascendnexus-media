export type DeploymentOperationType = "deploy" | "verify" | "rollback" | "maintenance_enable" | "maintenance_disable" | "backup_check" | "restore_verify";
export type DeploymentOperationStatus = "requested" | "approved" | "running" | "completed" | "failed" | "canceled" | "archived";

export interface DeploymentOperationRecord {
  deploymentOperationId: string;
  operationType: DeploymentOperationType;
  environment: "local" | "test" | "staging" | "production";
  status: DeploymentOperationStatus;
  releaseId?: string;
  targetReleaseId?: string;
  requestedBy: string;
  approvedBy?: string;
  reason?: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  safeResult?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
