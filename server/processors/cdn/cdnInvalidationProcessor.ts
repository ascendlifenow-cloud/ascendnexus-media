import type { MediaProcessingJobOutput, MediaStorageObject } from "../../models/mediaModels";

export const processCdnInvalidation = async (storageObject: MediaStorageObject): Promise<MediaProcessingJobOutput[]> => [{
  outputId: `output-${Date.now()}-cdn-invalidate`,
  outputType: "custom",
  storageObjectId: storageObject.storageObjectId,
  status: "skipped",
  metadata: {
    invalidationPath: storageObject.publicUrl ?? storageObject.storagePath,
    reason: "CDN invalidation provider is not configured.",
  },
}];
