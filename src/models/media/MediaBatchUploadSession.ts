import type { MediaAssetMetadataValue } from "../admin";
import type { MediaBatchUploadJob } from "./MediaBatchUploadJob";
import type { MediaBatchFileItem } from "./MediaBatchFileItem";
import type { MediaUploadTarget } from "./MediaUploadTarget";

export type MediaBatchUploadSessionStatus =
  | "draft"
  | "ready"
  | "validating"
  | "uploading"
  | "processing"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "canceled";

export interface MediaBatchUploadSession {
  sessionId: string;
  batchJobId?: string;
  batchJob?: MediaBatchUploadJob;
  title?: string;
  status: MediaBatchUploadSessionStatus;
  files: MediaBatchFileItem[];
  uploadTargets: MediaUploadTarget[];
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  completedFiles: number;
  failedFiles: number;
  canceledFiles: number;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, MediaAssetMetadataValue>;
}
