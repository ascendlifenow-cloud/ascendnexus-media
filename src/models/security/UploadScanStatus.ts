export type UploadScanStatusValue = "not_configured" | "pending" | "scanning" | "clean" | "infected" | "failed" | "skipped";

export interface UploadScanStatus {
  scanId?: string;
  status: UploadScanStatusValue;
  provider?: string;
  checkedAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

