import type { MediaProcessingJobType } from "../models/mediaModels";
import { mediaBackendConfig } from "../config/mediaBackendConfig";

export const mediaQueueNames = {
  image: "media-image-processing",
  audio: "media-audio-processing",
  storage: "media-storage-operations",
  cdn: "media-cdn-operations",
  publication: "media-publication",
  maintenance: "media-maintenance",
  deadLetter: "media-dead-letter",
} as const;

export type MediaQueueName = typeof mediaQueueNames[keyof typeof mediaQueueNames];

export const mediaQueueConfig = {
  redisUrl: mediaBackendConfig.mediaQueueRedisUrl,
  prefix: mediaBackendConfig.mediaQueuePrefix,
  workersEnabled: mediaBackendConfig.mediaWorkersEnabled,
  maxAttempts: mediaBackendConfig.mediaJobMaxAttempts,
  backoffMs: mediaBackendConfig.mediaJobBackoffMs,
  removeCompletedAfter: mediaBackendConfig.mediaJobRemoveCompletedAfter,
  removeFailedAfter: mediaBackendConfig.mediaJobRemoveFailedAfter,
  workerConcurrency: {
    [mediaQueueNames.image]: mediaBackendConfig.mediaImageWorkerConcurrency,
    [mediaQueueNames.audio]: mediaBackendConfig.mediaAudioWorkerConcurrency,
    [mediaQueueNames.storage]: mediaBackendConfig.mediaStorageWorkerConcurrency,
    [mediaQueueNames.cdn]: 1,
    [mediaQueueNames.publication]: mediaBackendConfig.mediaPublicationWorkerConcurrency,
    [mediaQueueNames.maintenance]: 1,
    [mediaQueueNames.deadLetter]: 1,
  },
};

export const getQueueNameForJobType = (jobType: MediaProcessingJobType): MediaQueueName => {
  if (jobType.startsWith("image_") || jobType === "blur_placeholder") return mediaQueueNames.image;
  if (jobType.startsWith("audio_")) return mediaQueueNames.audio;
  if (jobType.startsWith("storage_") || jobType === "checksum_verify") return mediaQueueNames.storage;
  if (jobType === "cdn_invalidate") return mediaQueueNames.cdn;
  if (["publish", "republish", "unpublish", "archive", "restore", "rollback"].includes(jobType)) return mediaQueueNames.publication;
  if (jobType === "orphan_cleanup" || jobType === "legacy_asset_import") return mediaQueueNames.maintenance;
  return mediaQueueNames.maintenance;
};
