export type DeploymentVerificationStatus = "passed" | "failed" | "blocked" | "warning" | "archived";

export interface DeploymentVerificationRecord {
  deploymentVerificationId: string;
  releaseId?: string;
  environment: "local" | "test" | "staging" | "production";
  verificationType: "config" | "security" | "health" | "smoke" | "dns" | "tls" | "storage" | "cdn" | "worker" | "backup" | "restore" | "rollback";
  status: DeploymentVerificationStatus;
  target?: string;
  blockingIssues: string[];
  warnings: string[];
  evidence?: Record<string, unknown>;
  checkedAt: string;
  checkedBy?: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
