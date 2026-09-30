export type DeploymentReleaseStatus =
  | "built"
  | "staging"
  | "staging_verified"
  | "production_pending"
  | "deploying"
  | "deployed"
  | "verifying"
  | "verified"
  | "failed"
  | "rolling_back"
  | "rolled_back"
  | "superseded"
  | "archived";

export interface DeploymentReleaseRecord {
  deploymentReleaseId: string;
  version: string;
  commitSha: string;
  artifactDigest: string;
  environment: "local" | "test" | "staging" | "production";
  status: DeploymentReleaseStatus;
  requestedBy: string;
  approvedBy?: string;
  createdAt: string;
  deployedAt?: string;
  verifiedAt?: string;
  failedAt?: string;
  rolledBackAt?: string;
  previousReleaseId?: string;
  migrationVersion?: string;
  configurationVersion?: string;
  securityDecisionId?: string;
  buildRunId?: string;
  deploymentRunId?: string;
  healthSummary?: Record<string, unknown>;
  smokeTestSummary?: Record<string, unknown>;
  rollbackReason?: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
