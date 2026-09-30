export type StorageErrorCode =
  | "STORAGE_PROVIDER_NOT_CONFIGURED"
  | "STORAGE_PROVIDER_UNAVAILABLE"
  | "STORAGE_BUCKET_UNAVAILABLE"
  | "STORAGE_UPLOAD_FAILED"
  | "STORAGE_MULTIPART_CREATE_FAILED"
  | "STORAGE_PART_UPLOAD_FAILED"
  | "STORAGE_MULTIPART_COMPLETE_FAILED"
  | "STORAGE_MULTIPART_ABORT_FAILED"
  | "STORAGE_OBJECT_NOT_FOUND"
  | "STORAGE_METADATA_READ_FAILED"
  | "STORAGE_COPY_FAILED"
  | "STORAGE_PROMOTION_FAILED"
  | "STORAGE_DEMOTION_FAILED"
  | "STORAGE_DELETE_FAILED"
  | "STORAGE_SIGNED_URL_FAILED"
  | "STORAGE_SIGNED_URL_DENIED"
  | "STORAGE_PUBLIC_URL_UNAVAILABLE"
  | "STORAGE_INVALID_PATH"
  | "STORAGE_CHECKSUM_MISMATCH"
  | "STORAGE_SIZE_MISMATCH"
  | "STORAGE_DATABASE_SYNC_FAILED"
  | "STORAGE_CDN_UNAVAILABLE"
  | "STORAGE_RECONCILIATION_FAILED"
  | "STORAGE_FULL_SONG_PRIVACY_VIOLATION";

export interface NormalizedStorageError {
  code: StorageErrorCode;
  message: string;
  provider?: string;
  operation: string;
  retryable: boolean;
  storageObjectId?: string;
  assetId?: string;
  stage: string;
  safeDetails?: Record<string, string | number | boolean | null>;
}

export const normalizeStorageError = (error: unknown, operation: string, provider?: string): NormalizedStorageError => {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  const code: StorageErrorCode = lower.includes("not found") || lower.includes("404")
    ? "STORAGE_OBJECT_NOT_FOUND"
    : lower.includes("copy")
      ? "STORAGE_COPY_FAILED"
      : lower.includes("signed")
        ? "STORAGE_SIGNED_URL_FAILED"
        : lower.includes("configured")
          ? "STORAGE_PROVIDER_NOT_CONFIGURED"
          : "STORAGE_PROVIDER_UNAVAILABLE";
  return {
    code,
    message: code === "STORAGE_PROVIDER_UNAVAILABLE" ? "Storage provider is unavailable." : "Storage operation failed.",
    provider,
    operation,
    retryable: ["STORAGE_PROVIDER_UNAVAILABLE", "STORAGE_UPLOAD_FAILED", "STORAGE_COPY_FAILED"].includes(code),
    stage: operation,
  };
};
