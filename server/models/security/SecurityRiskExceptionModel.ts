export type SecurityRiskExceptionStatus = "requested" | "approved" | "rejected" | "expired" | "revoked" | "archived";

export interface SecurityRiskExceptionRecord {
  exceptionId: string;
  findingId?: string;
  title: string;
  justification: string;
  compensatingControls: string[];
  status: SecurityRiskExceptionStatus;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  expiresAt: string;
  revokedAt?: string;
  revokedBy?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
