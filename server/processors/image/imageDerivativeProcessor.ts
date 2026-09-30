import fs from "node:fs/promises";
import type { MediaProcessingJobOutput, MediaStorageObject } from "../../models/mediaModels";
import { createProcessingTempDir } from "../../utils/media/temporaryFileUtils";
import { runExternalProcess } from "../../utils/media/externalProcessUtils";
import {
  buildProcessingOutputStoragePath,
  createStorageObjectFromLocalFile,
  resolveLocalStorageObjectPath,
} from "../../utils/media/processingStorageUtils";

interface ImageDerivativePreset {
  outputType: MediaProcessingJobOutput["outputType"];
  maxSize: number;
  required: boolean;
}

const derivativeTypesForAsset = (assetType: string): ImageDerivativePreset[] => {
  if (assetType.includes("banner")) return [
    { outputType: "image_thumbnail", maxSize: 480, required: true },
    { outputType: "image_banner", maxSize: 1920, required: true },
    { outputType: "image_social", maxSize: 1200, required: false },
  ];
  if (assetType.includes("profile")) return [
    { outputType: "image_thumbnail", maxSize: 300, required: true },
    { outputType: "image_card", maxSize: 600, required: true },
    { outputType: "image_feature", maxSize: 1000, required: false },
  ];
  if (assetType.includes("character")) return [
    { outputType: "image_thumbnail", maxSize: 300, required: true },
    { outputType: "image_card", maxSize: 800, required: true },
    { outputType: "image_feature", maxSize: 1400, required: false },
  ];
  if (assetType.includes("gallery")) return [
    { outputType: "image_thumbnail", maxSize: 400, required: true },
    { outputType: "image_card", maxSize: 800, required: true },
    { outputType: "image_feature", maxSize: 1600, required: false },
  ];
  return [
    { outputType: "image_thumbnail", maxSize: 300, required: true },
    { outputType: "image_card", maxSize: 600, required: true },
    { outputType: "image_feature", maxSize: 1200, required: false },
    { outputType: "image_social", maxSize: 1200, required: false },
  ];
};

const mimeForExtension = (extension: string): string => extension === "jpg" || extension === "jpeg" ? "image/jpeg" : "image/png";

export const processImageDerivatives = async (storageObject: MediaStorageObject): Promise<MediaProcessingJobOutput[]> => {
  const sourcePath = resolveLocalStorageObjectPath(storageObject);
  const extension = storageObject.fileExtension === "jpg" || storageObject.fileExtension === "jpeg" ? "jpg" : "png";
  const workspace = await createProcessingTempDir(`derivatives-${storageObject.storageObjectId}`);
  const outputs: MediaProcessingJobOutput[] = [];

  try {
    for (const preset of derivativeTypesForAsset(storageObject.assetType)) {
      const localOutput = `${workspace}/${preset.outputType}.${extension}`;
      const result = await runExternalProcess("/usr/bin/sips", ["-Z", String(preset.maxSize), sourcePath, "--out", localOutput], { timeoutMs: 30000 });
      if (result.exitCode !== 0) {
        if (preset.required) throw new Error(`PROCESSING_IMAGE_DERIVATIVE_FAILED: ${result.stderr || preset.outputType}`);
        outputs.push({
          outputId: `output-${Date.now()}-${preset.outputType}`,
          outputType: preset.outputType,
          status: "failed",
          metadata: { retryable: false, reason: result.stderr || "Optional derivative failed." },
        });
        continue;
      }
      const storagePath = buildProcessingOutputStoragePath(storageObject, preset.outputType, extension);
      const derivativeStorageObject = await createStorageObjectFromLocalFile({
        source: storageObject,
        localFilePath: localOutput,
        storagePath,
        mimeType: mimeForExtension(extension),
        outputType: preset.outputType,
        metadata: { imageProcessor: "sips", maxSize: preset.maxSize, required: preset.required },
      });
      outputs.push({
        outputId: `output-${Date.now()}-${preset.outputType}`,
        outputType: preset.outputType,
        storageObjectId: derivativeStorageObject.storageObjectId,
        storagePath: derivativeStorageObject.storagePath,
        url: derivativeStorageObject.publicUrl,
        mimeType: derivativeStorageObject.mimeType,
        fileSizeBytes: derivativeStorageObject.fileSizeBytes,
        checksum: derivativeStorageObject.checksum,
        status: "ready",
        metadata: {
          accessLevel: derivativeStorageObject.accessLevel,
          sourceStorageObjectId: storageObject.storageObjectId,
          verifiedStorageObject: true,
        },
      });
    }
    return outputs;
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
};
