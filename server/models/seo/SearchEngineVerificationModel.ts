export interface SearchEngineVerificationRecord {
  searchEngineVerificationId: string;
  provider: "google" | "bing" | "indexnow" | "custom";
  verificationMethod: "dns_txt" | "html_file" | "meta_tag" | "api";
  domain: string;
  status: "not_configured" | "pending" | "verified" | "failed" | "expired" | "archived";
  verifiedAt?: string;
  lastCheckedAt?: string;
  verificationReferenceSafe?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
