export type MediaBatchUploadJobStatus =
  | "queued"
  | "uploading"
  | "processing"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "canceled";

export interface MediaBatchUploadJob {
  batchJobId: string;
  uploadJobIds: string[];
  status: MediaBatchUploadJobStatus;
  totalCount: number;
  queuedCount: number;
  uploadingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  canceledCount: number;
  progress: number;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
