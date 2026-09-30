export type DevelopmentSeedEnvironment = "development" | "test" | "staging";
export type DevelopmentSeedStatus = "completed" | "failed" | "blocked";
export type DevelopmentSeedPasswordMode = "generated" | "configured";

export interface DevelopmentSeedCredentialSummary {
  email: string;
  accountType: "admin" | "member";
  roleOrTier: string;
  status: string;
  passwordMode: DevelopmentSeedPasswordMode;
  temporaryPassword?: string;
}

export interface DevelopmentSeedRunRecord {
  seedRunId: string;
  seedVersion: string;
  environment: DevelopmentSeedEnvironment;
  status: DevelopmentSeedStatus;
  command: "seed" | "reset" | "verify" | "users";
  passwordMode: DevelopmentSeedPasswordMode;
  startedAt: string;
  completedAt: string;
  createdAdminUsers: number;
  createdMembers: number;
  createdContent: number;
  createdBillingScenarios: number;
  createdEngagementRecords: number;
  warnings: string[];
  errors: string[];
  metadataSafe?: Record<string, unknown>;
  schemaVersion: number;
}

export interface DevelopmentSeedVerificationReport {
  seedVersion: string;
  environment: string;
  productionProtected: boolean;
  status: "pass" | "fail" | "blocked";
  adminUsers: { expected: number; actual: number; missing: string[] };
  memberUsers: { expected: number; actual: number; missing: string[] };
  membershipAssignments: { expectedMinimum: number; actual: number };
  billingScenarios: { expectedMinimum: number; actual: number };
  engagementRecords: { expectedMinimum: number; actual: number };
  protectedContent: { expectedMinimum: number; actual: number };
  lastRun?: DevelopmentSeedRunRecord;
  warnings: string[];
  errors: string[];
  checkedAt: string;
}
