export type ConsentCategory = "necessary" | "analytics" | "functional" | "marketing";

export interface ConsentCategoryDefinition {
  category: ConsentCategory;
  required: boolean;
  defaultEnabled: boolean;
  title: string;
  description: string;
  examples: string[];
}

export interface ConsentPolicyRecord {
  consentPolicyId: string;
  version: string;
  status: "draft" | "published" | "archived";
  publicationState: "draft" | "ready_to_publish" | "published" | "archived";
  title: string;
  summary: string;
  categories: ConsentCategoryDefinition[];
  gpcPolicy: "honor_as_opt_out" | "ignore_with_notice";
  doNotTrackPolicy: "honor_as_opt_out" | "not_supported_notice";
  expirationDays: number;
  privacyPath: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  archivedAt?: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
