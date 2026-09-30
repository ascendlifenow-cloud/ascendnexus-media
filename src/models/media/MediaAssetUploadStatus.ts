import type { MediaAssetMetadataValue } from "../admin";

export type MediaAssetUploadStatusValue =
  | "idle"
  | "validating"
  | "validation_failed"
  | "uploading"
  | "processing"
  | "creating_asset"
  | "completed"
  | "failed"
  | "canceled";

export type MediaAssetUploadStage = "validation" | "storage" | "asset_record" | "complete" | "error";

export interface MediaAssetUploadStatus {
  uploadId: string;
  fileName: string;
  status: MediaAssetUploadStatusValue;
  progress: number;
  stage: MediaAssetUploadStage;
  message?: string;
  errors?: string[];
  warnings?: string[];
  metadata?: Record<string, MediaAssetMetadataValue>;
}
