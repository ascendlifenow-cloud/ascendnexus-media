export type SecurityScanRunStatus = "queued" | "running" | "passed" | "failed" | "completed_with_warnings" | "archived";

export interface SecurityScanRunRecord {
  scanRunId: string;
  scanType: "health" | "dependency" | "secret" | "sast" | "dast" | "api_authz" | "headers" | "cors" | "artifact" | "container" | "sbom";
  status: SecurityScanRunStatus;
  startedAt: string;
  completedAt?: string;
  triggeredBy?: string;
  command?: string;
  summary: string;
  findingsCreated: number;
  warnings: string[];
  failures: string[];
  artifactPath?: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
