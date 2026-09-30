import type { MediaProcessingJob, MediaProcessingJobOutput } from "../models/mediaModels";
import { mediaBackendConfig } from "../config/mediaBackendConfig";
import { mediaStoragePersistenceService } from "../services/media/MediaStoragePersistenceService";
import { mediaAssetPersistenceService } from "../services/media/MediaAssetPersistenceService";
import { processBlurPlaceholder } from "../processors/image/blurPlaceholderProcessor";
import { processImageDerivatives } from "../processors/image/imageDerivativeProcessor";
import { processImageMetadata } from "../processors/image/imageMetadataProcessor";
import { BaseMediaWorker } from "./BaseMediaWorker";

export class ImageProcessingWorker extends BaseMediaWorker {
  constructor() {
    super("image-processing-worker", "media-image-processing", mediaBackendConfig.mediaImageWorkerConcurrency);
  }

  protected async execute(job: MediaProcessingJob): Promise<MediaProcessingJobOutput[]> {
    const storageObject = await mediaStoragePersistenceService.get(job.storageObjectId);
    if (!storageObject) throw new Error("PROCESSING_SOURCE_NOT_FOUND: storage object not found.");
    if (job.jobType === "image_metadata") return processImageMetadata(storageObject);
    if (job.jobType === "image_derivatives") {
      const outputs = await processImageDerivatives(storageObject);
      const readyDerivative = outputs.find((output) => output.status === "ready" && output.url);
      const asset = await mediaAssetPersistenceService.get(job.assetId);
      if (readyDerivative) {
        await mediaAssetPersistenceService.patch(job.assetId, {
          thumbnailUrl: readyDerivative.url,
          largeUrl: readyDerivative.url,
          metadata: {
            ...(asset?.metadata ?? {}),
            processingDerivativeReady: true,
            derivativeStorageObjectIds: outputs.filter((output) => output.storageObjectId).map((output) => output.storageObjectId),
          },
        });
      } else {
        await mediaAssetPersistenceService.patch(job.assetId, {
          metadata: {
            ...(asset?.metadata ?? {}),
            processingDerivativeReady: outputs.some((output) => output.status === "ready"),
            derivativeStorageObjectIds: outputs.filter((output) => output.storageObjectId).map((output) => output.storageObjectId),
          },
        });
      }
      return outputs;
    }
    return processBlurPlaceholder(storageObject);
  }
}
