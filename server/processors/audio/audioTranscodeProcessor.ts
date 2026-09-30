import type { MediaProcessingJobOutput, MediaStorageObject } from "../../models/mediaModels";
import fs from "node:fs/promises";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import { runExternalProcess } from "../../utils/media/externalProcessUtils";
import { createProcessingTempDir } from "../../utils/media/temporaryFileUtils";
import {
  buildProcessingOutputStoragePath,
  createStorageObjectFromLocalFile,
  resolveLocalStorageObjectPath,
} from "../../utils/media/processingStorageUtils";

export const processAudioTranscode = async (storageObject: MediaStorageObject): Promise<MediaProcessingJobOutput[]> => {
  if (!mediaBackendConfig.mediaAudioTranscodeEnabled) {
    return [{
      outputId: `output-${Date.now()}-transcode-mp3`,
      outputType: "audio_transcoded_mp3",
      storageObjectId: storageObject.storageObjectId,
      status: "skipped",
      metadata: {
        sourceStoragePath: storageObject.storagePath,
        fullSongPrivate: storageObject.assetType === "full_song",
        reason: "Audio transcoding is disabled by configuration.",
      },
    }];
  }
  const sourcePath = resolveLocalStorageObjectPath(storageObject);
  const workspace = await createProcessingTempDir(`transcode-${storageObject.storageObjectId}`);
  const localOutput = `${workspace}/transcoded.mp3`;
  try {
    const result = await runExternalProcess("ffmpeg", [
      "-y",
      "-i", sourcePath,
      "-vn",
      "-codec:a", "libmp3lame",
      "-b:a", mediaBackendConfig.mediaAudioPreviewBitrate,
      localOutput,
    ], { timeoutMs: 120000 });
    if (result.exitCode !== 0) {
      return [{
        outputId: `output-${Date.now()}-transcode-mp3`,
        outputType: "audio_transcoded_mp3",
        storageObjectId: storageObject.storageObjectId,
        status: "failed",
        metadata: {
          sourceStoragePath: storageObject.storagePath,
          fullSongPrivate: storageObject.assetType === "full_song",
          reason: "FFmpeg transcode failed or FFmpeg is unavailable.",
        },
      }];
    }
    const storagePath = buildProcessingOutputStoragePath(storageObject, "audio_transcoded_mp3", "mp3");
    const outputStorageObject = await createStorageObjectFromLocalFile({
      source: storageObject,
      localFilePath: localOutput,
      storagePath,
      mimeType: "audio/mpeg",
      outputType: "audio_transcoded_mp3",
      metadata: { bitrate: mediaBackendConfig.mediaAudioPreviewBitrate, fullSongPrivate: storageObject.assetType === "full_song" },
    });
    return [{
      outputId: `output-${Date.now()}-transcode-mp3`,
      outputType: "audio_transcoded_mp3",
      storageObjectId: outputStorageObject.storageObjectId,
      storagePath: outputStorageObject.storagePath,
      url: outputStorageObject.publicUrl,
      mimeType: outputStorageObject.mimeType,
      fileSizeBytes: outputStorageObject.fileSizeBytes,
      checksum: outputStorageObject.checksum,
      status: "ready",
      metadata: {
        accessLevel: outputStorageObject.accessLevel,
        fullSongPrivate: storageObject.assetType === "full_song",
        verifiedStorageObject: true,
      },
    }];
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
};
