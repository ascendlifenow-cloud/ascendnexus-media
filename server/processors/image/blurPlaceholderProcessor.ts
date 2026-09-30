import type { MediaProcessingJobOutput, MediaStorageObject } from "../../models/mediaModels";
import fs from "node:fs/promises";
import { createProcessingTempDir } from "../../utils/media/temporaryFileUtils";
import { runExternalProcess } from "../../utils/media/externalProcessUtils";
import { resolveLocalStorageObjectPath } from "../../utils/media/processingStorageUtils";

export const processBlurPlaceholder = async (storageObject: MediaStorageObject): Promise<MediaProcessingJobOutput[]> => {
  const sourcePath = resolveLocalStorageObjectPath(storageObject);
  const workspace = await createProcessingTempDir(`blur-${storageObject.storageObjectId}`);
  const localOutput = `${workspace}/blur.png`;
  try {
    const result = await runExternalProcess("/usr/bin/sips", ["-Z", "24", sourcePath, "--out", localOutput], { timeoutMs: 15000 });
    if (result.exitCode !== 0) {
      return [{
        outputId: `output-${Date.now()}-blur-placeholder`,
        outputType: "blur_placeholder",
        storageObjectId: storageObject.storageObjectId,
        status: "failed",
        metadata: { sourceStoragePath: storageObject.storagePath, reason: result.stderr || "Blur placeholder generation failed." },
      }];
    }
    const buffer = await fs.readFile(localOutput);
    const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
    if (dataUrl.length > 8192) {
      return [{
        outputId: `output-${Date.now()}-blur-placeholder`,
        outputType: "blur_placeholder",
        storageObjectId: storageObject.storageObjectId,
        status: "skipped",
        metadata: { sourceStoragePath: storageObject.storagePath, reason: "Generated placeholder exceeded size limit." },
      }];
    }
    return [{
      outputId: `output-${Date.now()}-blur-placeholder`,
      outputType: "blur_placeholder",
      storageObjectId: storageObject.storageObjectId,
      mimeType: "image/png",
      fileSizeBytes: buffer.length,
      status: "ready",
      metadata: {
        sourceStoragePath: storageObject.storagePath,
        blurDataUrl: dataUrl,
        imageProcessor: "sips",
      },
    }];
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
};
