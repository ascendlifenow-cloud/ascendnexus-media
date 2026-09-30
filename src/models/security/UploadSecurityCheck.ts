export type UploadSecurityCheckStatus = "passed" | "warning" | "failed" | "skipped";
export type UploadSecurityCheckSeverity = "info" | "warning" | "error" | "blocking";

export interface UploadSecurityCheck {
  checkId: string;
  name: string;
  status: UploadSecurityCheckStatus;
  severity: UploadSecurityCheckSeverity;
  message: string;
  code: string;
  metadata?: Record<string, string | number | boolean | null>;
}

