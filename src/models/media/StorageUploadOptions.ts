import type { MediaAccessLevel } from "./MediaStorageObject";

export interface StorageUploadOptions {
  accessLevel?: MediaAccessLevel;
  bucket?: string;
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string | number | boolean | null>;
  onProgress?: (progress: number) => void;
  overwrite?: boolean;
  publicRead?: boolean;
}

export interface SignedUrlOptions {
  expiresInSeconds?: number;
  contentType?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
