export type StorageReconciliationStatus = "healthy" | "warnings" | "failed" | "critical";

export interface StorageReconciliationReport {
  reportId: string;
  status: StorageReconciliationStatus;
  checkedObjects: number;
  verifiedObjects: number;
  missingObjects: string[];
  orphanRecords: string[];
  orphanProviderObjects: string[];
  privatePublicUrlViolations: string[];
  fullSongViolations: string[];
  checksumMismatches: string[];
  duplicatePaths: string[];
  abandonedUploads: string[];
  repairableIssues: string[];
  manualReviewIssues: string[];
  checkedAt: string;
}
