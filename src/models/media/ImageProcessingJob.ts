import type { ImageAssetMetadata } from "./ImageAssetMetadata";
import type { ImageDerivative } from "./ImageDerivative";
import type { ImageDerivativePlanItem } from "./ImageDerivativePlan";

export type ImageProcessingStatus = "pending" | "analyzing" | "processing" | "completed" | "failed" | "skipped";

export interface ImageProcessingJob {
  jobId: string;
  assetId: string;
  storageObjectId?: string;
  sourceUrl: string;
  sourceStoragePath?: string;
  status: ImageProcessingStatus;
  requestedDerivatives: ImageDerivativePlanItem[];
  generatedDerivatives: ImageDerivative[];
  metadata: ImageAssetMetadata;
  errors?: string[];
  warnings?: string[];
  createdAt: string;
  updatedAt?: string;
}
