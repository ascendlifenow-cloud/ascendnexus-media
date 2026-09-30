import type { MediaStorageObject, MediaUploadTargetInput, UploadedMediaFile } from "../models/mediaModels";

export interface BackendStorageUploadInput {
  file: UploadedMediaFile;
  storagePath: string;
  target: MediaUploadTargetInput;
  checksum: string;
  uploadedBy?: string;
}

export interface BackendStorageProviderAdapter {
  getProviderName(): string;
  isConfigured(): boolean;
  upload(input: BackendStorageUploadInput): Promise<MediaStorageObject>;
  supportsDirectUpload?(): boolean;
  createMultipartUpload?(storagePath: string, options: {
    mimeType: string;
    fileSizeBytes: number;
    assetType: string;
    accessLevel: string;
    checksum?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ multipartUploadId: string; requiredHeaders?: Record<string, string> }>;
  createPresignedPartUploadUrl?(storagePath: string, multipartUploadId: string, partNumber: number, options: {
    expiresInSeconds: number;
    contentLength?: number;
    mimeType?: string;
  }): Promise<{ uploadUrl: string; expiresAt: string; requiredHeaders?: Record<string, string> }>;
  completeMultipartUpload?(storagePath: string, multipartUploadId: string, completedParts: Array<{ partNumber: number; etag: string }>, options?: Record<string, unknown>): Promise<{ etag?: string; metadata?: Record<string, unknown> }>;
  abortMultipartUpload?(storagePath: string, multipartUploadId: string, options?: Record<string, unknown>): Promise<boolean>;
  listUploadedParts?(storagePath: string, multipartUploadId: string, options?: Record<string, unknown>): Promise<Array<{ partNumber: number; etag?: string; sizeBytes?: number }>>;
  copyFile?(sourcePath: string, destinationPath: string, options?: { accessLevel?: string; assetType?: string; mimeType?: string; metadata?: Record<string, unknown> }): Promise<{ etag?: string; publicUrl?: string; metadata?: Record<string, unknown> }>;
  delete(storagePath: string): Promise<boolean>;
  fileExists(storagePath: string): Promise<{ exists: boolean; storagePath: string; provider: string; metadata?: Record<string, unknown> }>;
  getObjectMetadata?(storagePath: string): Promise<Record<string, unknown> | undefined>;
  getSignedUrl(storageObject: MediaStorageObject, expirationSeconds: number, purpose: string): Promise<string | undefined>;
  getPublicUrl(storagePath: string): string | undefined;
  getHealthStatus(): Promise<{
    provider: string;
    configured: boolean;
    available: boolean;
    bucketConfigured: boolean;
    publicUrlConfigured: boolean;
    signedUrlsSupported: boolean;
    deleteSupported: boolean;
    copySupported?: boolean;
    multipartSupported?: boolean;
    message: string;
    checkedAt: string;
  }>;
}
