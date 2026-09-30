import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import type { MediaProcessingJob } from "../../models/mediaModels";
import { isRetryableMediaProcessingError } from "./processingErrorUtils";

export const getNextRetryAt = (attempts: number): string =>
  new Date(Date.now() + mediaBackendConfig.mediaJobBackoffMs * Math.max(1, 2 ** Math.max(0, attempts - 1))).toISOString();

export const shouldRetryProcessingJob = (job: MediaProcessingJob, error: unknown): boolean =>
  job.attempts < job.maxAttempts && isRetryableMediaProcessingError(error);
