import type { StorageProviderName } from "./MediaStorageObject";

export interface StorageUploadResponse {
  success: boolean;
  provider: StorageProviderName;
  storagePath: string;
  publicUrl?: string;
  signedUrl?: string;
  bucket?: string;
  etag?: string;
  checksum?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  uploadedAt: string;
  metadata?: Record<string, string | number | boolean | null>;
  errors?: string[];
  warnings?: string[];
}
