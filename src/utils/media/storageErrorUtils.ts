import type { StorageProviderName } from "../../models/media";

export interface NormalizedStorageError {
  code: string;
  message: string;
  provider: StorageProviderName;
  retryable: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}

const retryableCodes = new Set(["network_error", "timeout", "rate_limited", "temporary_unavailable"]);

export const normalizeStorageError = (
  error: unknown,
  provider: StorageProviderName,
  metadata: Record<string, string | number | boolean | null> = {},
): NormalizedStorageError => {
  const rawMessage = error instanceof Error ? error.message : typeof error === "string" ? error : "Storage operation failed.";
  const message = rawMessage.replace(/(secret|token|key|credential)=([^&\s]+)/gi, "$1=[redacted]");
  const code = /not configured|unavailable|unsupported/i.test(message)
    ? "provider_unavailable"
    : /timeout/i.test(message)
      ? "timeout"
      : /network|fetch/i.test(message)
        ? "network_error"
        : "storage_error";
  return {
    code,
    message,
    provider,
    retryable: retryableCodes.has(code),
    metadata,
  };
};
