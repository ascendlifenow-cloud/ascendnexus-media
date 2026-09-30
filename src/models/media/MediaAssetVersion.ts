import type { MediaAssetType } from "../admin";

export type MediaAssetVersionStatus = "active" | "replaced" | "archived" | "rollback_available" | "deleted";

export interface MediaAssetVersion {
  versionId: string;
  assetId: string;
  versionNumber: number;
  storageObjectId: string;
  url: string;
  thumbnailUrl?: string;
  largeUrl?: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  assetType: MediaAssetType;
  status: MediaAssetVersionStatus;
  changeReason?: string;
  replacedByVersionId?: string;
  createdAt: string;
  createdBy?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
