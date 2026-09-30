import type { MediaProcessingJobType } from "../../models/mediaModels";

export type MediaProcessingErrorCategory =
  | "transient"
  | "provider"
  | "tool_unavailable"
  | "unsupported_format"
  | "corrupt_source"
  | "permission"
  | "configuration"
  | "permanent"
  | "unknown";

export interface MediaProcessingErrorPayload {
  code: string;
  message: string;
  jobType: MediaProcessingJobType;
  stage: string;
  retryable: boolean;
  processingJobId?: string;
}

export const sanitizeProcessingErrorMessage = (value: unknown): string =>
  String(value instanceof Error ? value.message : value || "Processing failed.")
    .replace(/(secret|token|key|credential|authorization)=([^&\s]+)/gi, "$1=[redacted]")
    .replace(/X-Amz-[A-Za-z-]+=([^&\s]+)/g, "X-Amz-[redacted]")
    .slice(0, 500);

export const classifyMediaProcessingError = (error: unknown): MediaProcessingErrorCategory => {
  const message = sanitizeProcessingErrorMessage(error).toLowerCase();
  if (message.includes("not configured") || message.includes("missing config")) return "configuration";
  if (message.includes("ffmpeg") || message.includes("ffprobe") || message.includes("sharp") || message.includes("tool")) return "tool_unavailable";
  if (message.includes("unsupported")) return "unsupported_format";
  if (message.includes("corrupt") || message.includes("invalid image") || message.includes("invalid audio")) return "corrupt_source";
  if (message.includes("permission") || message.includes("denied") || message.includes("forbidden")) return "permission";
  if (message.includes("timeout") || message.includes("temporar") || message.includes("unavailable")) return "transient";
  if (message.includes("provider") || message.includes("storage")) return "provider";
  return "unknown";
};

export const isRetryableMediaProcessingError = (error: unknown): boolean =>
  ["transient", "provider", "unknown"].includes(classifyMediaProcessingError(error));

export const toProcessingErrorPayload = (
  error: unknown,
  jobType: MediaProcessingJobType,
  stage: string,
  processingJobId?: string,
): MediaProcessingErrorPayload => ({
  code: "PROCESSING_IMAGE_FAILED",
  message: sanitizeProcessingErrorMessage(error),
  jobType,
  stage,
  retryable: isRetryableMediaProcessingError(error),
  processingJobId,
});
