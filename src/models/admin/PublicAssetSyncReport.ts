import type { PublicAssetSyncCheck } from "./PublicAssetSyncCheck";

export type PublicAssetSyncReportStatus = "passed" | "passed_with_warnings" | "failed" | "blocked" | "unknown";

export interface PublicAssetSyncReport {
  reportId: string;
  status: PublicAssetSyncReportStatus;
  totalChecks: number;
  syncedCount: number;
  warningCount: number;
  errorCount: number;
  blockingCount: number;
  fallbackCount: number;
  checks: PublicAssetSyncCheck[];
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

