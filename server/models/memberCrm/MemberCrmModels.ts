export type MemberSupportStatus = "open" | "pending" | "resolved" | "escalated";
export type MemberRiskLevel = "low" | "medium" | "high" | "critical";
export type MemberModerationAction = "warn" | "suspend" | "disable_features" | "restrict_access" | "temporary_ban" | "permanent_ban" | "restore";
export type MemberModerationStatus = "active" | "expired" | "revoked" | "completed";

export interface MemberSupportNoteRecord {
  supportNoteId: string;
  memberId: string;
  status: MemberSupportStatus;
  subject: string;
  body: string;
  internal: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface MemberAccountFlagRecord {
  flagId: string;
  memberId: string;
  flagKey: string;
  label: string;
  severity: MemberRiskLevel;
  status: "active" | "cleared";
  reason: string;
  createdBy: string;
  clearedBy?: string;
  clearedAt?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface MemberModerationRecord {
  moderationId: string;
  memberId: string;
  action: MemberModerationAction;
  status: MemberModerationStatus;
  reason: string;
  startsAt: string;
  endsAt?: string;
  createdBy: string;
  revokedBy?: string;
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface MemberCrmReportRecord {
  crmReportId: string;
  reportType: "daily_member" | "weekly_engagement" | "monthly_membership" | "retention" | "growth" | "support" | "security" | "risk";
  generatedAt: string;
  metrics: Record<string, number | string>;
  schemaVersion: number;
}
