import type { MediaCategory, StorageProviderName } from "./MediaStorageObject";

export interface StorageProviderConfig {
  provider: StorageProviderName;
  enabled: boolean;
  baseUrl?: string;
  uploadApiBaseUrl?: string;
  bucket?: string;
  region?: string;
  publicPathPrefix?: string;
  privatePathPrefix?: string;
  maxFileSizeBytes?: number;
  allowedMimeTypes?: string[];
  mockEnabled?: boolean;
  defaultAccessLevel?: import("./MediaStorageObject").MediaAccessLevel;
  maxUploadRetries?: number;
  retryDelayMs?: number;
  retryableErrorCodes?: string[];
  metadata?: Record<string, string | number | boolean | null>;
}

export interface MediaUploadTypeConfig {
  mediaCategory: MediaCategory;
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
}
