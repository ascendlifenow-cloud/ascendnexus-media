export interface AdminLaunchReadinessReport {
  promptId: string;
  generatedAt: string;
  environment: string;
  decision: "READY" | "READY_WITH_POST_LAUNCH_ITEMS" | "FUNCTIONALLY_BLOCKED";
  finalMessage: string;
  counts: Record<string, number>;
  checks: Array<{ checkId: string; area: string; status: "pass" | "warn" | "fail"; summary: string; evidence: Record<string, unknown> }>;
  blockers: Array<{ blockerId: string; severity: "P0" | "P1" | "P2" | "P3"; status: string; title: string; area: string; evidence: string; remediation: string }>;
  summary: Record<string, unknown>;
}

export interface AdminLaunchExperienceCertificationReport {
  run: {
    certificationRunId: string;
    environment: string;
    applicationVersion: string;
    decision: "experience_ready" | "experience_ready_with_post_launch_items" | "experience_blocked" | "incomplete";
    openP0Count: number;
    openP1Count: number;
    openP2Count: number;
    evidenceReferences: string[];
  };
  health: {
    promptId: "ANM-WEB-129";
    checkedAt: string;
    environment: string;
    overallStatus: "pass" | "warn" | "fail" | "not_applicable";
    decision: "EXPERIENCE READY" | "EXPERIENCE READY WITH POST-LAUNCH ITEMS" | "EXPERIENCE BLOCKED";
    finalMessage: string;
    counts: Record<string, number>;
    summary: Record<string, unknown>;
    publicRoutes: Array<{ path: string; status: string; summary: string }>;
    memberRoutes: Array<{ path: string; status: string; summary: string }>;
    accessMatrix: Array<Record<string, string>>;
    checks: Array<{ checkId: string; area: string; status: "pass" | "warn" | "fail" | "not_applicable"; summary: string; evidence: Record<string, unknown> }>;
    issues: Array<{ issueId: string; severity: "P0" | "P1" | "P2" | "P3"; title: string; area: string; evidence: string; remediation: string }>;
    evidenceReferences: string[];
  };
}

export interface AdminOperationsCertificationReport {
  promptId: "ANM-WEB-130";
  checkedAt: string;
  environment: string;
  decision: "ADMIN OPERATIONS READY" | "ADMIN OPERATIONS READY WITH POST-LAUNCH ITEMS" | "ADMIN OPERATIONS BLOCKED";
  finalMessage: string;
  counts: Record<string, number>;
  summary: Record<string, unknown>;
  routeInventory: Array<{ requestedPath: string; canonicalPath: string; area: string; requiredPermission?: string; status: string; notes: string }>;
  checks: Array<{ checkId: string; area: string; status: "pass" | "warn" | "fail" | "not_applicable"; summary: string; evidence: Record<string, unknown> }>;
  issues: Array<{ issueId: string; severity: "P0" | "P1" | "P2" | "P3"; area: string; title: string; evidence: string; remediation: string }>;
  evidenceReferences: string[];
}

export interface ProductionInfrastructureCertificationReport {
  promptId: "ANM-WEB-131";
  checkedAt: string;
  environment: string;
  decision: "INFRASTRUCTURE READY" | "INFRASTRUCTURE READY WITH POST-LAUNCH ITEMS" | "INFRASTRUCTURE BLOCKED";
  finalMessage: string;
  counts: Record<string, number>;
  summary: Record<string, unknown>;
  architecture: Array<{ component: string; provider: string; region: string; exposure: string; authentication: string; healthCheck: string; backupStrategy: string; scalingModel: string; failureImpact: string }>;
  environmentMatrix: {
    categories: Record<string, { configured: number; missing: number; invalid: number; optional: number; notApplicable: number }>;
    variables: Array<{ name: string; category: string; state: string; required: boolean; sensitive: boolean; summary: string }>;
  };
  checks: Array<{ checkId: string; area: string; status: "pass" | "warn" | "fail" | "not_applicable"; summary: string; evidence: Record<string, unknown> }>;
  issues: Array<{ issueId: string; severity: "P0" | "P1" | "P2" | "P3"; area: string; title: string; evidence: string; remediation: string }>;
  evidenceReferences: string[];
}

export interface ProductionSecurityRecoveryCertificationReport {
  promptId: "ANM-WEB-132";
  checkedAt: string;
  environment: string;
  decision: "SECURITY READY" | "SECURITY READY WITH POST-LAUNCH ITEMS" | "SECURITY BLOCKED";
  finalMessage: string;
  counts: Record<string, number>;
  summary: Record<string, unknown>;
  controls: Array<{ controlKey: string; category: string; owner: string; enforcementPoint: string; status: "pass" | "warn" | "fail" | "not_applicable"; evidence: string }>;
  attackSurface: Array<{ surface: string; exposure: string; primaryControls: string[]; certificationStatus: string; residualRisk: string }>;
  adminAuthorizationMatrix: Array<{ role: string; permissionCount: number; criticalPermissionCount: number; launchSecurityAccess: boolean }>;
  checks: Array<{ checkId: string; area: string; status: "pass" | "warn" | "fail" | "not_applicable"; summary: string; evidence: Record<string, unknown> }>;
  issues: Array<{ issueId: string; severity: "P0" | "P1" | "P2" | "P3"; area: string; title: string; evidence: string; remediation: string }>;
  evidenceReferences: string[];
}

export interface FinalLaunchSignoffReport {
  promptId: "ANM-WEB-133";
  checkedAt: string;
  environment: string;
  decision: "GO" | "NO-GO";
  finalMessage: string;
  counts: Record<string, number>;
  releaseCandidate: Record<string, string>;
  gateSummary: Array<{ promptId: string; certificationArea: string; environment: string; decision: string; openP0: number; openP1: number; openP2: number; finalGateStatus: "pass" | "warn" | "fail" | "not_applicable" }>;
  blockerRegistry: Array<{ issueId: string; sourcePrompt: string; severity: "P0" | "P1" | "P2" | "P3"; area: string; description: string; launchImpact: string; fix: string; verification: string; evidence: string; disposition: string }>;
  launchScope: Array<{ feature: string; launchState: string; reason: string; criticalPath: boolean }>;
  featureFlags: Array<{ flag: string; launchState: string; reason: string; owner: string; emergencyChangeProcedure: string }>;
  checks: Array<{ checkId: string; area: string; status: "pass" | "warn" | "fail" | "not_applicable"; summary: string; evidence: Record<string, unknown> }>;
  evidenceReferences: string[];
}

const parse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.errors?.[0] ?? "Launch readiness request failed.");
  return payload.data as T;
};

export const adminLaunchReadinessApiService = {
  async getReport(): Promise<AdminLaunchReadinessReport> {
    return fetch("/api/admin/launch-readiness", { credentials: "include" }).then((response) => parse<AdminLaunchReadinessReport>(response));
  },
  async getExperienceReport(): Promise<AdminLaunchExperienceCertificationReport> {
    return fetch("/api/admin/launch-readiness/experience", { credentials: "include" }).then((response) => parse<AdminLaunchExperienceCertificationReport>(response));
  },
  async getAdminOperationsReport(): Promise<AdminOperationsCertificationReport> {
    return fetch("/api/admin/launch-readiness/admin-operations", { credentials: "include" }).then((response) => parse<AdminOperationsCertificationReport>(response));
  },
  async getInfrastructureReport(): Promise<ProductionInfrastructureCertificationReport> {
    return fetch("/api/admin/launch-readiness/infrastructure", { credentials: "include" }).then((response) => parse<ProductionInfrastructureCertificationReport>(response));
  },
  async verifyInfrastructure(): Promise<ProductionInfrastructureCertificationReport> {
    return fetch("/api/admin/launch-readiness/infrastructure/verify", { method: "POST", credentials: "include" }).then((response) => parse<ProductionInfrastructureCertificationReport>(response));
  },
  async getSecurityRecoveryReport(): Promise<ProductionSecurityRecoveryCertificationReport> {
    return fetch("/api/admin/launch-readiness/security-recovery", { credentials: "include" }).then((response) => parse<ProductionSecurityRecoveryCertificationReport>(response));
  },
  async verifySecurityRecovery(): Promise<ProductionSecurityRecoveryCertificationReport> {
    return fetch("/api/admin/launch-readiness/security-recovery/verify", { method: "POST", credentials: "include" }).then((response) => parse<ProductionSecurityRecoveryCertificationReport>(response));
  },
  async getFinalSignoffReport(): Promise<FinalLaunchSignoffReport> {
    return fetch("/api/admin/launch-readiness/final-signoff", { credentials: "include" }).then((response) => parse<FinalLaunchSignoffReport>(response));
  },
  async verifyFinalSignoff(): Promise<FinalLaunchSignoffReport> {
    return fetch("/api/admin/launch-readiness/final-signoff/verify", { method: "POST", credentials: "include" }).then((response) => parse<FinalLaunchSignoffReport>(response));
  },
};
