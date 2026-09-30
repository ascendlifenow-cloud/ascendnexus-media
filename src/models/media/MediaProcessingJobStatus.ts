export type MediaProcessingJobType =
  | "image_processing"
  | "audio_processing"
  | "derivative_generation"
  | "waveform_generation"
  | "transcoding"
  | "metadata_extraction"
  | "custom";

export type MediaProcessingStatus = "pending" | "processing" | "completed" | "failed" | "skipped" | "retrying";

export interface MediaProcessingJobStatus {
  processingJobId: string;
  uploadJobId?: string;
  assetId: string;
  jobType: MediaProcessingJobType;
  status: MediaProcessingStatus;
  progress?: number;
  message?: string;
  outputs?: unknown[];
  errors?: string[];
  warnings?: string[];
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
