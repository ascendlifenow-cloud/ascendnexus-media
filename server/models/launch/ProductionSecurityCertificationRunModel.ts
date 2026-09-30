import type { AdminOperationsStatus } from "../../services/launch/admin/AdminOperationsCertificationService";

export type ProductionSecurityCertificationDecision =
  | "security_ready"
  | "security_ready_with_post_launch_items"
  | "security_blocked"
  | "incomplete";

export interface ProductionSecurityCertificationResult {
  status: AdminOperationsStatus;
  summary: string;
  evidence?: Record<string, unknown>;
}

export interface ProductionSecurityCertificationRun {
  certificationRunId: string;
  environment: string;
  applicationVersion: string;
  commitReference?: string;
  executedBy: string;
  startedAt: string;
  completedAt: string;
  authenticationResult: ProductionSecurityCertificationResult;
  authorizationResult: ProductionSecurityCertificationResult;
  mediaProtectionResult: ProductionSecurityCertificationResult;
  adminMutationResult: ProductionSecurityCertificationResult;
  corsResult: ProductionSecurityCertificationResult;
  csrfResult: ProductionSecurityCertificationResult;
  securityHeadersResult: ProductionSecurityCertificationResult;
  cookieResult: ProductionSecurityCertificationResult;
  rateLimitResult: ProductionSecurityCertificationResult;
  privacyResult: ProductionSecurityCertificationResult;
  logPrivacyResult: ProductionSecurityCertificationResult;
  auditResult: ProductionSecurityCertificationResult;
  observabilityResult: ProductionSecurityCertificationResult;
  alertResult: ProductionSecurityCertificationResult;
  backupResult: ProductionSecurityCertificationResult;
  restoreResult: ProductionSecurityCertificationResult;
  rollbackResult: ProductionSecurityCertificationResult;
  incidentResult: ProductionSecurityCertificationResult;
  openP0Count: number;
  openP1Count: number;
  openP2Count: number;
  evidenceReferences: string[];
  decision: ProductionSecurityCertificationDecision;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}
