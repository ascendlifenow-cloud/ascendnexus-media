import type { MediaAssetOwnerType, MediaAssetType } from "../admin";
import type { MediaFileValidationResult } from "./MediaFileValidationResult";
import type { MediaUploadTargetType } from "./MediaUploadTarget";

export type MediaUploadJobStatus =
  | "queued"
  | "validating"
  | "validation_failed"
  | "ready"
  | "uploading"
  | "uploaded"
  | "processing"
  | "completed"
  | "failed"
  | "canceled"
  | "retrying";

export type MediaUploadJobStage =
  | "selection"
  | "validation"
  | "storage_upload"
  | "asset_record_creation"
  | "image_processing"
  | "audio_processing"
  | "linking"
  | "complete"
  | "error";

export interface MediaUploadJob {
  uploadJobId: string;
  queueItemId?: string;
  fileName: string;
  originalFileName: string;
  fileSizeBytes: number;
  mimeType: string;
  assetType: MediaAssetType;
  targetType: MediaUploadTargetType;
  targetId?: string;
  ownerType?: MediaAssetOwnerType;
  ownerId?: string;
  status: MediaUploadJobStatus;
  stage: MediaUploadJobStage;
  progress: number;
  validationResult?: MediaFileValidationResult;
  storageObjectId?: string;
  mediaAssetId?: string;
  processingJobIds?: string[];
  errors?: string[];
  warnings?: string[];
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
