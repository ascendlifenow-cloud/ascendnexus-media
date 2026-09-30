import type { MediaProcessingJobOutput, MediaStorageObject } from "../../models/mediaModels";

export const processStorageDemotion = async (storageObject: MediaStorageObject): Promise<MediaProcessingJobOutput[]> => [{
  outputId: `output-${Date.now()}-private-storage`,
  outputType: "custom",
  storageObjectId: storageObject.storageObjectId,
  storagePath: storageObject.storagePath,
  status: "ready",
  metadata: { privateVisibilityEnforced: storageObject.accessLevel !== "public" },
}];
