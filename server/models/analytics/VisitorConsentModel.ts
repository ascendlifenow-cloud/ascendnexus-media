import type { ConsentCategory } from "./ConsentPolicyModel";

export interface VisitorConsentRecord {
  visitorConsentId: string;
  consentReference: string;
  policyVersion: string;
  status: "active" | "withdrawn" | "expired" | "superseded";
  choices: Record<ConsentCategory, boolean>;
  source: "banner" | "preference_center" | "withdrawal" | "gpc" | "dnt";
  gpcApplied: boolean;
  dntApplied: boolean;
  userAgentHash?: string;
  clientHash?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  withdrawnAt?: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
