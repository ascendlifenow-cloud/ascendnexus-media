import type { MediaProcessingJobOutput, MediaStorageObject } from "../../models/mediaModels";
import { backendStorageProviderRegistry } from "../../storage/StorageProviderRegistry";
import { verifyUploadedObject } from "../../utils/media/uploadVerificationUtils";

export const processChecksumVerification = async (storageObject: MediaStorageObject): Promise<MediaProcessingJobOutput[]> => {
  const exists = await backendStorageProviderRegistry.getActiveProvider().fileExists(storageObject.storagePath);
  if (!exists.exists) throw new Error("PROCESSING_SOURCE_NOT_FOUND: source object was not found.");
  const verification = verifyUploadedObject({
    expectedSizeBytes: storageObject.fileSizeBytes,
    providerMetadata: exists.metadata,
    checksumExpected: storageObject.checksum,
    checksumActual: typeof exists.metadata?.checksum === "string" ? exists.metadata.checksum : undefined,
  });
  if (!verification.valid) throw new Error(verification.errors.join(" "));
  return [{
    outputId: `output-${Date.now()}-checksum`,
    outputType: "checksum",
    storageObjectId: storageObject.storageObjectId,
    checksum: storageObject.checksum,
    status: "ready",
    metadata: { warnings: verification.warnings },
  }];
};
