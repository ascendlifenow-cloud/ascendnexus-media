export type SecurityFindingSeverity = "informational" | "low" | "medium" | "high" | "critical";
export type SecurityFindingStatus = "open" | "triaged" | "mitigated" | "accepted_risk" | "false_positive" | "archived";

export interface SecurityFindingRecord {
  findingId: string;
  source: "manual" | "security_health" | "dependency_scan" | "sast" | "dast" | "secret_scan" | "artifact_scan" | "container_scan";
  title: string;
  description: string;
  severity: SecurityFindingSeverity;
  status: SecurityFindingStatus;
  category: string;
  affectedComponent?: string;
  route?: string;
  cwe?: string;
  cvssScore?: number;
  evidence?: Record<string, unknown>;
  remediation?: string;
  owner?: string;
  dueAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  exceptionId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
