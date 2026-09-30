import type { MediaAssetType } from "../admin";

export type StorageProviderName = "mock" | "local" | "s3" | "r2" | "supabase" | "firebase" | "custom";
export type MediaCategory = "audio" | "image" | "video" | "document" | "custom";
export type MediaAccessLevel = "public" | "private" | "admin_only" | "signed";
export type MediaStorageStatus = "pending" | "uploaded" | "processing" | "ready" | "failed" | "archived" | "deleted";

export interface MediaStorageObject {
  storageObjectId: string;
  assetId?: string;
  provider: StorageProviderName;
  bucket?: string;
  storagePath: string;
  publicUrl?: string;
  signedUrl?: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileExtension: string;
  fileSizeBytes: number;
  mediaCategory: MediaCategory;
  assetType: MediaAssetType;
  accessLevel: MediaAccessLevel;
  status: MediaStorageStatus;
  checksum?: string;
  uploadedBy?: string;
  uploadedAt: string;
  updatedAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
