import type { MediaFileValidationResult, MediaProcessingJobStatus, MediaUploadJob, MediaUploadResult, MediaUploadTarget } from "../../../models/media";

export type AdminUploadQueueItemStatus =
  | "queued"
  | "validating"
  | "ready"
  | "uploading"
  | "processing"
  | "completed"
  | "failed"
  | "canceled";

export interface AdminUploadQueueItem {
  queueItemId: string;
  file: File;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  status: AdminUploadQueueItemStatus;
  progress: number;
  previewUrl?: string;
  uploadTarget: MediaUploadTarget;
  validationResult?: MediaFileValidationResult;
  uploadJobId?: string;
  uploadJob?: MediaUploadJob;
  processingStatuses?: MediaProcessingJobStatus[];
  uploadResult?: MediaUploadResult;
  errors?: string[];
  warnings?: string[];
  createdAt: string;
  updatedAt?: string;
}
