import type { MediaAssetType } from "../admin";
import type { AudioProcessedOutputType } from "./AudioProcessedOutput";

export interface AudioProcessingPlanItem {
  type: AudioProcessedOutputType;
  format?: string;
  required: boolean;
  publicAllowed: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface AudioProcessingPlan {
  assetType: MediaAssetType;
  sourceDurationSeconds?: number;
  outputs: AudioProcessingPlanItem[];
  metadata?: Record<string, string | number | boolean | null>;
}
