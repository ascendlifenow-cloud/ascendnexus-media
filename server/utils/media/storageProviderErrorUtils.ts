export interface NormalizedStorageProviderError {
  code:
    | "STORAGE_PROVIDER_NOT_CONFIGURED"
    | "STORAGE_PROVIDER_UNAVAILABLE"
    | "STORAGE_UPLOAD_FAILED"
    | "STORAGE_OBJECT_NOT_FOUND"
    | "STORAGE_DELETE_FAILED"
    | "STORAGE_SIGNED_URL_FAILED"
    | "STORAGE_PERMISSION_DENIED"
    | "STORAGE_INVALID_PATH"
    | "STORAGE_PUBLIC_URL_UNAVAILABLE"
    | "STORAGE_PROMOTION_FAILED";
  message: string;
  retryable: boolean;
  provider: string;
  stage: string;
}

export class StorageProviderError extends Error {
  constructor(public readonly normalized: NormalizedStorageProviderError) {
    super(normalized.message);
  }
}

export const normalizeStorageProviderError = (
  error: unknown,
  provider: string,
  stage: string,
): NormalizedStorageProviderError => {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  const code = lower.includes("not found") || lower.includes("404")
    ? "STORAGE_OBJECT_NOT_FOUND"
    : lower.includes("denied") || lower.includes("forbidden") || lower.includes("403")
      ? "STORAGE_PERMISSION_DENIED"
      : lower.includes("configured")
        ? "STORAGE_PROVIDER_NOT_CONFIGURED"
        : stage === "delete"
          ? "STORAGE_DELETE_FAILED"
          : stage === "signed_url"
            ? "STORAGE_SIGNED_URL_FAILED"
            : "STORAGE_UPLOAD_FAILED";
  return {
    code,
    message: code === "STORAGE_PERMISSION_DENIED" ? "Storage provider denied the request." : "Storage provider request failed.",
    retryable: ["STORAGE_PROVIDER_UNAVAILABLE", "STORAGE_UPLOAD_FAILED"].includes(code),
    provider,
    stage,
  };
};
