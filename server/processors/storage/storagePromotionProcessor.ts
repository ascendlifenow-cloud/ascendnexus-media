import type { MediaProcessingJobOutput, MediaStorageObject } from "../../models/mediaModels";

export const processStoragePromotion = async (storageObject: MediaStorageObject): Promise<MediaProcessingJobOutput[]> => [{
  outputId: `output-${Date.now()}-public-storage`,
  outputType: "public_storage_object",
  storageObjectId: storageObject.storageObjectId,
  storagePath: storageObject.storagePath,
  url: storageObject.publicUrl,
  status: storageObject.publicUrl ? "ready" : "skipped",
  metadata: {
    reason: storageObject.publicUrl ? "Storage object is already public." : "Public promotion is queued/readiness-only for this provider.",
  },
}];
