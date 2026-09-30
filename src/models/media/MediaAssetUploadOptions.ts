import type { MediaAssetMetadataValue, MediaAssetStatus } from "../admin";
import type { MediaAccessLevel } from "./MediaStorageObject";

export interface MediaAssetUploadOptions {
  status?: MediaAssetStatus;
  title?: string;
  description?: string;
  altText?: string;
  credit?: string;
  sortOrder?: number;
  generateAssetRecord?: boolean;
  accessLevel?: MediaAccessLevel;
  onProgress?: (progress: number) => void;
  onStatusChange?: (status: import("./MediaAssetUploadStatus").MediaAssetUploadStatus) => void;
  metadata?: Record<string, MediaAssetMetadataValue>;
}
