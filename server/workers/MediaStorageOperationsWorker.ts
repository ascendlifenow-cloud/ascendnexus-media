import type { MediaProcessingJob, MediaProcessingJobOutput } from "../models/mediaModels";
import { mediaBackendConfig } from "../config/mediaBackendConfig";
import { mediaStoragePersistenceService } from "../services/media/MediaStoragePersistenceService";
import { processChecksumVerification } from "../processors/storage/checksumVerificationProcessor";
import { processStorageDemotion } from "../processors/storage/storageDemotionProcessor";
import { processStoragePromotion } from "../processors/storage/storagePromotionProcessor";
import { BaseMediaWorker } from "./BaseMediaWorker";

export class MediaStorageOperationsWorker extends BaseMediaWorker {
  constructor() {
    super("media-storage-operations-worker", "media-storage-operations", mediaBackendConfig.mediaStorageWorkerConcurrency);
  }

  protected async execute(job: MediaProcessingJob): Promise<MediaProcessingJobOutput[]> {
    const storageObject = await mediaStoragePersistenceService.get(job.storageObjectId);
    if (!storageObject) throw new Error("PROCESSING_SOURCE_NOT_FOUND: storage object not found.");
    if (job.jobType === "checksum_verify") return processChecksumVerification(storageObject);
    if (job.jobType === "storage_promote_public") return processStoragePromotion(storageObject);
    return processStorageDemotion(storageObject);
  }
}
