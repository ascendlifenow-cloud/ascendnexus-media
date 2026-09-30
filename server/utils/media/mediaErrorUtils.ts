export type MediaErrorCode =
  | "MEDIA_AUTH_REQUIRED"
  | "MEDIA_PERMISSION_DENIED"
  | "MEDIA_FILE_MISSING"
  | "MEDIA_TYPE_UNSUPPORTED"
  | "MEDIA_FILE_TOO_LARGE"
  | "MEDIA_SIGNATURE_MISMATCH"
  | "MEDIA_TARGET_INVALID"
  | "MEDIA_STORAGE_FAILED"
  | "MEDIA_DATABASE_FAILED"
  | "MEDIA_UPLOAD_NOT_FOUND"
  | "MEDIA_SIGNED_URL_DENIED"
  | "MEDIA_REQUEST_INVALID"
  | `PUBLICATION_${string}`
  | `ARTIST_${string}`
  | `RELEASE_${string}`;

export class MediaApiError extends Error {
  constructor(
    public readonly code: MediaErrorCode,
    message: string,
    public readonly status = 400,
    public readonly stage = "error",
    public readonly retryable = false,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const toSafeMediaError = (error: unknown) => {
  if (error instanceof MediaApiError) {
    return {
      code: error.code,
      message: error.message,
      stage: error.stage,
      retryable: error.retryable,
      details: error.details,
    };
  }
  return {
    code: "MEDIA_REQUEST_INVALID",
    message: "Media request failed.",
    stage: "error",
    retryable: false,
  };
};
