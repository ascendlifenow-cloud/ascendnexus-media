export type ConsentCategory = "necessary" | "analytics" | "functional" | "marketing";

export interface PublicConsentCategoryDefinition {
  category: ConsentCategory;
  required: boolean;
  defaultEnabled: boolean;
  title: string;
  description: string;
  examples: string[];
}

export interface PublicConsentPolicy {
  version: string;
  title: string;
  summary: string;
  categories: PublicConsentCategoryDefinition[];
  gpcPolicy: "honor_as_opt_out" | "ignore_with_notice";
  doNotTrackPolicy: "honor_as_opt_out" | "not_supported_notice";
  expirationDays: number;
  privacyPath: string;
  checkedAt: string;
}

export interface PublicConsentRecord {
  consentReference: string;
  policyVersion: string;
  status: "active" | "withdrawn" | "expired" | "superseded";
  choices: Record<ConsentCategory, boolean>;
  source: "banner" | "preference_center" | "withdrawal" | "gpc" | "dnt";
  gpcApplied: boolean;
  dntApplied: boolean;
  expiresAt: string;
  updatedAt: string;
}

export interface PublicConsentAvailability {
  enabled: boolean;
  consentRequired: boolean;
  policyVersion: string;
  gpcDetected: boolean;
  dntDetected: boolean;
  privacyPath: string;
  checkedAt: string;
}
