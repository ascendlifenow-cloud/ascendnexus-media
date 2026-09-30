export type ServiceHealthStatus = "healthy" | "degraded" | "unavailable" | "disabled" | "unknown";
export type AlertSeverity = "critical" | "high" | "medium" | "low";

export interface SyntheticCheckRecord {
  checkId: string;
  name: string;
  type: "http" | "browser" | "api" | "worker" | "provider";
  target: string;
  frequencySeconds: number;
  timeoutMs: number;
  criticality: AlertSeverity;
  environment: string;
  enabled: boolean;
  successCriteria: string[];
  runbook: string;
  status: "active" | "disabled" | "archived";
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}

export interface SyntheticCheckResultRecord {
  syntheticResultId: string;
  checkId: string;
  status: "passed" | "failed" | "skipped";
  latencyMs?: number;
  checkedAt: string;
  safeSummary: string;
  errors: string[];
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}

export interface AlertPolicyRecord {
  alertPolicyId: string;
  name: string;
  service: string;
  signal: string;
  condition: string;
  threshold: number;
  windowSeconds: number;
  severity: AlertSeverity;
  notificationRoute: string;
  deduplicationKey: string;
  recoveryCondition: string;
  runbook: string;
  owner: string;
  enabled: boolean;
  state: "ok" | "pending" | "firing" | "acknowledged" | "resolved" | "suppressed";
  status: "active" | "disabled" | "archived";
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}

export interface ServiceLevelObjectiveRecord {
  sloId: string;
  name: string;
  service: string;
  indicator: string;
  target: number;
  windowDays: number;
  measurementSource: string;
  exclusions: string[];
  criticality: AlertSeverity;
  owner: string;
  alertPolicy?: string;
  errorBudgetPolicy: string;
  status: "active" | "disabled" | "archived";
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}

export interface ReliabilityIncidentRecord {
  incidentId: string;
  title: string;
  severity: AlertSeverity;
  status: "detected" | "acknowledged" | "investigating" | "mitigating" | "monitoring" | "resolved" | "closed";
  detectedAt: string;
  acknowledgedAt?: string;
  mitigatedAt?: string;
  resolvedAt?: string;
  services: string[];
  environment: string;
  releaseVersion?: string;
  trigger: string;
  alertIds: string[];
  summary: string;
  impact: string;
  rootCause?: string;
  timeline: Array<{ at: string; message: string; actor?: string }>;
  actions: string[];
  owner?: string;
  runbook: string;
  postmortemRequired: boolean;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}

export interface PerformanceBaselineRecord {
  baselineId: string;
  environment: string;
  releaseVersion: string;
  measuredAt: string;
  scenario: string;
  metrics: Record<string, number>;
  datasetSize: string;
  concurrency: number;
  cacheState: "cold" | "warm" | "mixed";
  tool: string;
  status: "passed" | "warning" | "failed";
  warnings: string[];
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}

export interface LaunchCertificationEvidenceRecord {
  evidenceId: string;
  promptId: string;
  requirement: string;
  status: "verified" | "verified_with_warning" | "failed" | "not_applicable" | "missing";
  source: string;
  artifactPath?: string;
  command?: string;
  resultReference?: string;
  verifiedAt: string;
  verifiedBy: string;
  environment: string;
  releaseVersion: string;
  notes: string;
  blocking: boolean;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}

export interface LaunchCertificationDecisionRecord {
  launchCertificationDecisionId: string;
  environment: string;
  releaseVersion: string;
  decision: "certified" | "certified_with_warnings" | "not_certified";
  blockingIssues: string[];
  warnings: string[];
  evidenceCount: number;
  decidedAt: string;
  decidedBy: string;
  status: "active" | "archived";
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
