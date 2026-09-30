export type AdminOperationsDecision =
  | "admin_ready"
  | "admin_ready_with_post_launch_items"
  | "admin_blocked"
  | "incomplete";

export interface AdminOperationsCertificationResult {
  status: "pass" | "warn" | "fail" | "not_applicable";
  summary: string;
  evidence?: Record<string, unknown>;
}

export interface AdminOperationsCertificationRun {
  certificationRunId: string;
  environment: string;
  applicationVersion: string;
  commitReference?: string;
  executedBy: string;
  startedAt: string;
  completedAt?: string;
  adminAuthResult: AdminOperationsCertificationResult;
  navigationResult: AdminOperationsCertificationResult;
  dashboardResult: AdminOperationsCertificationResult;
  artistCrudResult: AdminOperationsCertificationResult;
  artistMediaResult: AdminOperationsCertificationResult;
  releaseCrudResult: AdminOperationsCertificationResult;
  releaseMediaResult: AdminOperationsCertificationResult;
  releaseActionBarResult: AdminOperationsCertificationResult;
  publishReadinessResult: AdminOperationsCertificationResult;
  publicationResult: AdminOperationsCertificationResult;
  mediaLibraryResult: AdminOperationsCertificationResult;
  mediaPickerResult: AdminOperationsCertificationResult;
  mediaIntakeResult: AdminOperationsCertificationResult;
  mediaReviewResult: AdminOperationsCertificationResult;
  mediaProcessingResult: AdminOperationsCertificationResult;
  exportResult: AdminOperationsCertificationResult;
  importResult: AdminOperationsCertificationResult;
  permissionsResult: AdminOperationsCertificationResult;
  accessibilityResult: AdminOperationsCertificationResult;
  browserHealthResult: AdminOperationsCertificationResult;
  stagingResult: AdminOperationsCertificationResult;
  productionSafeResult: AdminOperationsCertificationResult;
  openP0Count: number;
  openP1Count: number;
  openP2Count: number;
  evidenceReferences: string[];
  decision: AdminOperationsDecision;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}
