export interface SeoVerificationRunRecord {
  seoVerificationRunId: string;
  verificationType: "health" | "metadata" | "canonical" | "sitemap" | "robots" | "structured_data" | "social" | "links" | "redirects" | "privacy" | "launch_gate";
  environment: "local" | "test" | "staging" | "production";
  status: "passed" | "failed" | "blocked" | "warning" | "archived";
  target?: string;
  blockingIssues: string[];
  warnings: string[];
  checkedAt: string;
  checkedBy?: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
