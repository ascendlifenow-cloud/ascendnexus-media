const parse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.errors?.[0] ?? "Development seed request failed.");
  return payload.data as T;
};

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
  errors: string[];
  warnings: string[];
  checkedAt: string;
}

export interface DevelopmentSeedUserSummary {
  email: string;
  displayName: string;
  roles?: string[];
  tier?: string;
  status?: string;
  scenario?: string;
}

export interface DevelopmentSeedOverview {
  verification: DevelopmentSeedVerificationReport;
  users: {
    seedVersion: string;
    environment: string;
    passwordMode: "generated" | "configured";
    note: string;
    admins: DevelopmentSeedUserSummary[];
    members: DevelopmentSeedUserSummary[];
  };
}

export const adminDevelopmentSeedApiService = {
  overview: () => fetch("/api/admin/development/seeds", { credentials: "include" }).then((response) => parse<DevelopmentSeedOverview>(response)),
  run: () => fetch("/api/admin/development/seeds/run", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ includePasswords: false }) }).then((response) => parse<Record<string, unknown>>(response)),
  verify: () => fetch("/api/admin/development/seeds/verify", { credentials: "include" }).then((response) => parse<DevelopmentSeedVerificationReport>(response)),
  reset: (confirmation: string) => fetch("/api/admin/development/seeds/reset", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation }) }).then((response) => parse<Record<string, unknown>>(response)),
};
