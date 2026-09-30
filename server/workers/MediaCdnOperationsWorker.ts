import type { MediaProcessingJob, MediaProcessingJobOutput } from "../models/mediaModels";
import { mediaStoragePersistenceService } from "../services/media/MediaStoragePersistenceService";
import { processCdnInvalidation } from "../processors/cdn/cdnInvalidationProcessor";
import { BaseMediaWorker } from "./BaseMediaWorker";

export class MediaCdnOperationsWorker extends BaseMediaWorker {
  constructor() {
    super("media-cdn-operations-worker", "media-cdn-operations", 1);
  }

  protected async execute(job: MediaProcessingJob): Promise<MediaProcessingJobOutput[]> {
    const storageObject = await mediaStoragePersistenceService.get(job.storageObjectId);
    if (!storageObject) throw new Error("PROCESSING_SOURCE_NOT_FOUND: storage object not found.");
    return processCdnInvalidation(storageObject);
  }
}
