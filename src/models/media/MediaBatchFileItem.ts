import type { MediaAssetType, MediaAssetMetadataValue } from "../admin";
import type { UploadSecurityCheckResult } from "../security";
import type { MediaCategory } from "./MediaStorageObject";
import type { MediaFileValidationResult } from "./MediaFileValidationResult";
import type { MediaUploadResult } from "./MediaUploadResult";
import type { MediaUploadTarget } from "./MediaUploadTarget";

export type MediaBatchFileItemStatus =
  | "selected"
  | "validating"
  | "validation_failed"
  | "ready"
  | "queued"
  | "uploading"
  | "processing"
  | "completed"
  | "failed"
  | "canceled"
  | "skipped";

export interface MediaBatchFileItem {
  batchFileId: string;
  file: File;
  fileName: string;
  sanitizedFileName?: string;
  fileSizeBytes: number;
  mimeType: string;
  assetType: MediaAssetType;
  mediaCategory: MediaCategory;
  uploadTarget: MediaUploadTarget;
  validationResult?: MediaFileValidationResult;
  securityCheckResult?: UploadSecurityCheckResult;
  uploadJobId?: string;
  uploadResult?: MediaUploadResult;
  status: MediaBatchFileItemStatus;
  progress: number;
  errors?: string[];
  warnings?: string[];
  metadata?: Record<string, MediaAssetMetadataValue>;
}
