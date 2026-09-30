import type { AudioAssetMetadata } from "./AudioAssetMetadata";
import type { AudioProcessedOutput } from "./AudioProcessedOutput";
import type { AudioProcessingPlanItem } from "./AudioProcessingPlan";

export type AudioProcessingStatus = "pending" | "analyzing" | "processing" | "completed" | "failed" | "skipped";

export interface AudioProcessingJob {
  jobId: string;
  assetId: string;
  storageObjectId?: string;
  sourceUrl: string;
  sourceStoragePath?: string;
  status: AudioProcessingStatus;
  requestedOutputs: AudioProcessingPlanItem[];
  generatedOutputs: AudioProcessedOutput[];
  metadata: AudioAssetMetadata;
  errors?: string[];
  warnings?: string[];
  createdAt: string;
  updatedAt?: string;
}
