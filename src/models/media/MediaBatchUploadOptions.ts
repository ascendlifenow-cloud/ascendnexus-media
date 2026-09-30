import type { MediaAssetMetadataValue, MediaAssetOwnerType, MediaAssetType } from "../admin";
import type { MediaAccessLevel } from "./MediaStorageObject";
import type { MediaUploadIntendedUse, MediaUploadTargetType } from "./MediaUploadTarget";

export interface MediaBatchUploadOptions {
  defaultAssetType?: MediaAssetType;
  allowMixedMedia: boolean;
  autoInferAssetType: boolean;
  continueOnError: boolean;
  maxFiles?: number;
  maxTotalSizeBytes?: number;
  accessLevel?: MediaAccessLevel;
  ownerType?: MediaAssetOwnerType;
  ownerId?: string;
  targetType?: MediaUploadTargetType;
  intendedUse?: MediaUploadIntendedUse;
  title?: string;
  metadata?: Record<string, MediaAssetMetadataValue>;
}

export const defaultMediaBatchUploadOptions: MediaBatchUploadOptions = {
  allowMixedMedia: true,
  autoInferAssetType: true,
  continueOnError: true,
  accessLevel: "admin_only",
  targetType: "media_library",
  ownerType: "media_library",
  intendedUse: "batch_upload",
};
