export type PublicMemberExperienceDecision =
  | "experience_ready"
  | "experience_ready_with_post_launch_items"
  | "experience_blocked"
  | "incomplete";

export interface PublicMemberExperienceCertificationResult {
  status: "pass" | "warn" | "fail" | "not_applicable";
  summary: string;
  evidence?: Record<string, unknown>;
}

export interface PublicMemberExperienceCertificationRun {
  certificationRunId: string;
  environment: string;
  applicationVersion: string;
  commitReference?: string;
  executedBy: string;
  startedAt: string;
  completedAt?: string;
  publicResult: PublicMemberExperienceCertificationResult;
  guestResult: PublicMemberExperienceCertificationResult;
  memberResult: PublicMemberExperienceCertificationResult;
  navigationResult: PublicMemberExperienceCertificationResult;
  routingResult: PublicMemberExperienceCertificationResult;
  previewResult: PublicMemberExperienceCertificationResult;
  protectedContentResult: PublicMemberExperienceCertificationResult;
  responsiveResult: PublicMemberExperienceCertificationResult;
  accessibilityResult: PublicMemberExperienceCertificationResult;
  seoResult: PublicMemberExperienceCertificationResult;
  performanceResult: PublicMemberExperienceCertificationResult;
  browserResult: PublicMemberExperienceCertificationResult;
  consoleResult: PublicMemberExperienceCertificationResult;
  networkResult: PublicMemberExperienceCertificationResult;
  openP0Count: number;
  openP1Count: number;
  openP2Count: number;
  evidenceReferences: string[];
  decision: PublicMemberExperienceDecision;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}
