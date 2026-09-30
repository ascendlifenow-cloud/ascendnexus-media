import type { MediaUploadTarget } from "../media";
import type { UploadSecurityCheck } from "./UploadSecurityCheck";
import type { UploadScanStatus } from "./UploadScanStatus";

export interface UploadSecurityCheckResult {
  safe: boolean;
  blocked: boolean;
  warnings: string[];
  checks: UploadSecurityCheck[];
  fileName: string;
  sanitizedFileName: string;
  mimeType: string;
  fileExtension: string;
  assetType?: string;
  uploadTarget?: MediaUploadTarget;
  scanStatus?: UploadScanStatus;
  checkedAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

