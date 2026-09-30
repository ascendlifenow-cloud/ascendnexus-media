import type {
  SignedUrlOptions,
  StorageProviderHealth,
  StorageProviderName,
  StorageUploadOptions,
  StorageUploadResponse,
} from "../../models/media";
import { normalizeStorageError, type NormalizedStorageError } from "../../utils/media/storageErrorUtils";

export type StorageProviderUploadResponse = StorageUploadResponse;
export type { SignedUrlOptions, StorageProviderHealth, StorageUploadOptions, StorageUploadResponse };

export interface StorageProviderAdapter {
  getProviderName(): StorageProviderName;
  isEnabled(): boolean;
  uploadFile(file: File, storagePath: string, options?: StorageUploadOptions): Promise<StorageUploadResponse>;
  deleteFile(storagePath: string, options?: StorageUploadOptions): Promise<boolean>;
  getPublicUrl(storagePath: string): string | undefined;
  getSignedUrl(storagePath: string, options?: SignedUrlOptions): Promise<string | undefined>;
  fileExists(storagePath: string): Promise<boolean>;
  getHealthStatus(): Promise<StorageProviderHealth>;
  normalizeUploadResponse(response: Partial<StorageUploadResponse>, file?: File): StorageUploadResponse;
  normalizeError(error: unknown): NormalizedStorageError;
}

export abstract class BaseStorageProviderAdapter implements StorageProviderAdapter {
  abstract getProviderName(): StorageProviderName;
  abstract isEnabled(): boolean;
  abstract uploadFile(file: File, storagePath: string, options?: StorageUploadOptions): Promise<StorageUploadResponse>;
  abstract deleteFile(storagePath: string, options?: StorageUploadOptions): Promise<boolean>;
  abstract getPublicUrl(storagePath: string): string | undefined;
  abstract getSignedUrl(storagePath: string, options?: SignedUrlOptions): Promise<string | undefined>;
  abstract fileExists(storagePath: string): Promise<boolean>;
  abstract getHealthStatus(): Promise<StorageProviderHealth>;

  normalizeUploadResponse(response: Partial<StorageUploadResponse>, file?: File): StorageUploadResponse {
    return {
      success: response.success ?? true,
      provider: response.provider ?? this.getProviderName(),
      storagePath: response.storagePath ?? "",
      publicUrl: response.publicUrl,
      signedUrl: response.signedUrl,
      bucket: response.bucket,
      etag: response.etag,
      checksum: response.checksum,
      fileSizeBytes: response.fileSizeBytes ?? file?.size,
      mimeType: response.mimeType ?? file?.type,
      uploadedAt: response.uploadedAt ?? new Date().toISOString(),
      metadata: response.metadata,
      errors: response.errors,
      warnings: response.warnings,
    };
  }

  normalizeError(error: unknown): NormalizedStorageError {
    return normalizeStorageError(error, this.getProviderName());
  }
}
