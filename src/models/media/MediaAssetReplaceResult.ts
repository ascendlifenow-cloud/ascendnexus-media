import type { MediaAssetRecord } from "../admin";
import type { MediaAssetLink } from "./MediaAssetLink";
import type { MediaAssetVersion } from "./MediaAssetVersion";

export interface MediaAssetReplaceResult {
  success: boolean;
  assetId: string;
  previousVersion?: MediaAssetVersion;
  newVersion?: MediaAssetVersion;
  updatedMediaAsset?: MediaAssetRecord;
  updatedLinks?: MediaAssetLink[];
  warnings?: string[];
  errors?: string[];
  metadata?: Record<string, string | number | boolean | null>;
}
