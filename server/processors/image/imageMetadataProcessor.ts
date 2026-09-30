import type { MediaProcessingJobOutput, MediaStorageObject } from "../../models/mediaModels";
import { backendStorageProviderRegistry } from "../../storage/StorageProviderRegistry";
import { runExternalProcess } from "../../utils/media/externalProcessUtils";
import { resolveLocalStorageObjectPath } from "../../utils/media/processingStorageUtils";

const parseSipsValue = (output: string, key: string): string | undefined => {
  const line = output.split("\n").find((item) => item.trim().startsWith(`${key}:`));
  return line?.split(":").slice(1).join(":").trim();
};

const getOrientation = (width: number, height: number): string => {
  if (!width || !height) return "unknown";
  const ratio = width / height;
  if (Math.abs(ratio - 1) <= 0.05) return "square";
  if (ratio >= 1.7) return "wide";
  return width > height ? "landscape" : "portrait";
};

export const processImageMetadata = async (storageObject: MediaStorageObject): Promise<MediaProcessingJobOutput[]> => {
  const exists = await backendStorageProviderRegistry.getActiveProvider().fileExists(storageObject.storagePath);
  if (!exists.exists) throw new Error("PROCESSING_SOURCE_NOT_FOUND: source image was not found.");
  const localPath = resolveLocalStorageObjectPath(storageObject);
  const result = await runExternalProcess("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", "-g", "format", localPath], { timeoutMs: 15000 });
  if (result.exitCode !== 0) throw new Error(`PROCESSING_IMAGE_METADATA_FAILED: ${result.stderr || "image metadata extraction failed."}`);
  const width = Number.parseInt(parseSipsValue(result.stdout, "pixelWidth") ?? "0", 10);
  const height = Number.parseInt(parseSipsValue(result.stdout, "pixelHeight") ?? "0", 10);
  const format = parseSipsValue(result.stdout, "format") ?? storageObject.fileExtension;
  if (!width || !height) throw new Error("PROCESSING_IMAGE_METADATA_FAILED: image dimensions unavailable.");
  const aspectRatio = Number((width / height).toFixed(4));
  return [{
    outputId: `output-${Date.now()}-metadata`,
    outputType: "metadata",
    storageObjectId: storageObject.storageObjectId,
    mimeType: storageObject.mimeType,
    fileSizeBytes: storageObject.fileSizeBytes,
    width,
    height,
    status: "ready",
    metadata: {
      provider: exists.provider,
      sourceStoragePath: storageObject.storagePath,
      imageProcessor: "sips",
      width,
      height,
      aspectRatio,
      orientation: getOrientation(width, height),
      format,
      metadataVersion: 1,
    },
  }];
};
