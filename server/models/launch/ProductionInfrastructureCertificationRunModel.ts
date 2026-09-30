import type { AdminOperationsStatus } from "../../services/launch/admin/AdminOperationsCertificationService";

export type ProductionInfrastructureDecision =
  | "infrastructure_ready"
  | "infrastructure_ready_with_post_launch_items"
  | "infrastructure_blocked"
  | "incomplete";

export interface ProductionInfrastructureCertificationResult {
  status: AdminOperationsStatus;
  summary: string;
  evidence?: Record<string, unknown>;
}

export interface ProductionInfrastructureCertificationRun {
  certificationRunId: string;
  environment: string;
  applicationVersion: string;
  commitReference?: string;
  executedBy: string;
  startedAt: string;
  completedAt: string;
  environmentResult: ProductionInfrastructureCertificationResult;
  secretsResult: ProductionInfrastructureCertificationResult;
  databaseResult: ProductionInfrastructureCertificationResult;
  migrationResult: ProductionInfrastructureCertificationResult;
  redisResult: ProductionInfrastructureCertificationResult;
  queuesResult: ProductionInfrastructureCertificationResult;
  workersResult: ProductionInfrastructureCertificationResult;
  mediaWorkersResult: ProductionInfrastructureCertificationResult;
  storageResult: ProductionInfrastructureCertificationResult;
  cdnResult: ProductionInfrastructureCertificationResult;
  emailResult: ProductionInfrastructureCertificationResult;
  dnsResult: ProductionInfrastructureCertificationResult;
  tlsResult: ProductionInfrastructureCertificationResult;
  securityHeadersResult: ProductionInfrastructureCertificationResult;
  cookieResult: ProductionInfrastructureCertificationResult;
  corsResult: ProductionInfrastructureCertificationResult;
  csrfResult: ProductionInfrastructureCertificationResult;
  deploymentResult: ProductionInfrastructureCertificationResult;
  backupResult: ProductionInfrastructureCertificationResult;
  restoreResult: ProductionInfrastructureCertificationResult;
  rollbackResult: ProductionInfrastructureCertificationResult;
  smokeResult: ProductionInfrastructureCertificationResult;
  openP0Count: number;
  openP1Count: number;
  openP2Count: number;
  evidenceReferences: string[];
  decision: ProductionInfrastructureDecision;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}
