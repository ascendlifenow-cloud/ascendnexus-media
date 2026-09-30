export type DeploymentErrorCode =
  | "DEPLOYMENT_CONFIGURATION_INVALID"
  | "DEPLOYMENT_SECURITY_GATE_BLOCKED"
  | "DEPLOYMENT_ARTIFACT_INVALID"
  | "DEPLOYMENT_MIGRATION_PENDING"
  | "DEPLOYMENT_DATABASE_UNAVAILABLE"
  | "DEPLOYMENT_REDIS_UNAVAILABLE"
  | "DEPLOYMENT_STORAGE_UNAVAILABLE"
  | "DEPLOYMENT_CDN_UNAVAILABLE"
  | "DEPLOYMENT_API_UNHEALTHY"
  | "DEPLOYMENT_WORKER_UNHEALTHY"
  | "DEPLOYMENT_DNS_INVALID"
  | "DEPLOYMENT_TLS_INVALID"
  | "DEPLOYMENT_BACKUP_MISSING"
  | "DEPLOYMENT_RESTORE_UNVERIFIED"
  | "DEPLOYMENT_ROLLBACK_UNAVAILABLE"
  | "DEPLOYMENT_MONITORING_UNAVAILABLE"
  | "DEPLOYMENT_LAUNCH_BLOCKED"
  | "DEPLOYMENT_PERMISSION_DENIED";

export interface DeploymentSafeError {
  code: DeploymentErrorCode;
  message: string;
  stage?: string;
  retryable: boolean;
  safeDetails?: Record<string, unknown>;
}

export const deploymentError = (code: DeploymentErrorCode, message: string, stage?: string, safeDetails?: Record<string, unknown>): DeploymentSafeError => ({
  code,
  message,
  stage,
  retryable: !["DEPLOYMENT_PERMISSION_DENIED", "DEPLOYMENT_SECURITY_GATE_BLOCKED", "DEPLOYMENT_ARTIFACT_INVALID"].includes(code),
  safeDetails,
});
