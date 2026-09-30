import type { MediaAssetMetadataValue, MediaAssetRecord } from "../admin";
import type { MediaStorageObject } from "./MediaStorageObject";

export interface MediaUploadResult {
  success: boolean;
  assetId?: string;
  storageObjectId?: string;
  mediaAsset?: MediaAssetRecord;
  storageObject?: MediaStorageObject;
  publicUrl?: string;
  errors?: string[];
  warnings?: string[];
  metadata?: Record<string, MediaAssetMetadataValue>;
}
