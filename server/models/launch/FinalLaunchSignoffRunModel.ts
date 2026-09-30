export type FinalLaunchDecision = "GO" | "NO-GO";
export type FinalLaunchSeverity = "P0" | "P1" | "P2" | "P3";
export type FinalLaunchStatus = "pass" | "warn" | "fail" | "not_applicable";

export interface FinalLaunchCheckResult {
  status: FinalLaunchStatus;
  summary: string;
  evidence?: Record<string, unknown>;
}

export interface FinalLaunchSignoffRun {
  signoffRunId: string;
  environment: string;
  applicationVersion: string;
  releaseCandidateId: string;
  buildTimestamp?: string;
  commitReference?: string;
  executedBy: string;
  startedAt: string;
  completedAt: string;
  priorCertificationResult: FinalLaunchCheckResult;
  buildResult: FinalLaunchCheckResult;
  stagingRehearsalResult: FinalLaunchCheckResult;
  productionSmokeResult: FinalLaunchCheckResult;
  publicCriticalPathResult: FinalLaunchCheckResult;
  memberCriticalPathResult: FinalLaunchCheckResult;
  adminCriticalPathResult: FinalLaunchCheckResult;
  mediaCriticalPathResult: FinalLaunchCheckResult;
  protectedMediaResult: FinalLaunchCheckResult;
  infrastructureResult: FinalLaunchCheckResult;
  securityResult: FinalLaunchCheckResult;
  observabilityResult: FinalLaunchCheckResult;
  backupRestoreResult: FinalLaunchCheckResult;
  rollbackResult: FinalLaunchCheckResult;
  operatorReadinessResult: FinalLaunchCheckResult;
  openP0Count: number;
  openLaunchCriticalP1Count: number;
  openP2Count: number;
  openP3Count: number;
  evidenceReferences: string[];
  decision: FinalLaunchDecision;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}
