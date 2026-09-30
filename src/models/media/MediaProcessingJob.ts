export type MediaProcessingJobType =
  | "image_metadata"
  | "image_derivatives"
  | "blur_placeholder"
  | "audio_metadata"
  | "audio_waveform"
  | "audio_transcode"
  | "checksum_verify"
  | "storage_promote_public"
  | "storage_demote_private"
  | "cdn_invalidate"
  | "publish"
  | "republish"
  | "unpublish"
  | "archive"
  | "restore"
  | "rollback"
  | "legacy_asset_import"
  | "orphan_cleanup"
  | "custom";

export type MediaProcessingJobStatusValue = "queued" | "delayed" | "active" | "processing" | "completed" | "failed" | "retrying" | "canceled" | "dead_letter" | "skipped";

export interface MediaProcessingJob {
  processingJobId: string;
  assetId: string;
  storageObjectId: string;
  uploadJobId?: string;
  jobType: MediaProcessingJobType;
  queueName: string;
  status: MediaProcessingJobStatusValue;
  priority: number;
  progress: number;
  attempts: number;
  maxAttempts: number;
  input?: {
    assetId: string;
    storageObjectId: string;
    sourceStoragePath: string;
    sourceUrl?: string;
    assetType: string;
    mediaCategory: string;
    requestedOutputs: string[];
    accessLevel: string;
    options?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
  outputs?: Array<{
    outputId: string;
    outputType: string;
    storageObjectId?: string;
    storagePath?: string;
    url?: string;
    mimeType?: string;
    fileSizeBytes?: number;
    width?: number;
    height?: number;
    durationSeconds?: number;
    checksum?: string;
    status: "planned" | "processing" | "ready" | "failed" | "skipped";
    metadata?: Record<string, unknown>;
  }>;
  errors: string[];
  warnings: string[];
  startedAt?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface MediaAssetProcessingSummary {
  assetId: string;
  overallStatus: "not_started" | "queued" | "processing" | "completed" | "completed_with_warnings" | "failed" | "blocked";
  totalJobs: number;
  queuedJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  skippedJobs: number;
  progress: number;
  requiredOutputsReady: boolean;
  optionalOutputsReady: boolean;
  requiredOutputs: MediaProcessingOutputReadiness[];
  optionalOutputs: MediaProcessingOutputReadiness[];
  blockingIssues: string[];
  warnings: string[];
  updatedAt: string;
}

export interface MediaProcessingOutputReadiness {
  outputType: string;
  ready: boolean;
  status: MediaProcessingJobStatusValue;
  processingJobId: string;
  updatedAt: string;
}

export interface MediaProcessingHealth {
  redisConnected: boolean;
  workersEnabled: boolean;
  imageWorker?: WorkerHealth;
  audioWorker?: WorkerHealth;
  storageWorker?: WorkerHealth;
  cdnWorker?: WorkerHealth;
  publicationWorker?: WorkerHealth;
  queueCounts: Array<{ queueName: string; paused: boolean; queued: number; active: number; completed: number; failed: number; deadLetter: number }>;
  ffmpegAvailable: boolean;
  ffprobeAvailable: boolean;
  imageProcessorAvailable: boolean;
  checkedAt: string;
  warnings: string[];
  errors: string[];
}

export interface WorkerHealth {
  running: boolean;
  concurrency: number;
  lastJobAt?: string;
  failedJobCount: number;
  message?: string;
}
