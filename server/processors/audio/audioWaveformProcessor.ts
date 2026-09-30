import type { MediaProcessingJobOutput, MediaStorageObject } from "../../models/mediaModels";
import fs from "node:fs/promises";
import { runExternalProcess } from "../../utils/media/externalProcessUtils";
import { createProcessingTempDir } from "../../utils/media/temporaryFileUtils";
import {
  buildProcessingOutputStoragePath,
  createStorageObjectFromLocalFile,
  resolveLocalStorageObjectPath,
} from "../../utils/media/processingStorageUtils";

export const processAudioWaveform = async (storageObject: MediaStorageObject): Promise<MediaProcessingJobOutput[]> => {
  const sourcePath = resolveLocalStorageObjectPath(storageObject);
  const workspace = await createProcessingTempDir(`waveform-${storageObject.storageObjectId}`);
  const pcmPath = `${workspace}/waveform.raw`;
  try {
    const result = await runExternalProcess("ffmpeg", [
      "-y",
      "-i", sourcePath,
      "-ac", "1",
      "-ar", "8000",
      "-f", "s16le",
      pcmPath,
    ], { timeoutMs: 60000 });
    if (result.exitCode !== 0) {
      return [{
        outputId: `output-${Date.now()}-waveform-json`,
        outputType: "audio_waveform_json",
        storageObjectId: storageObject.storageObjectId,
        status: "skipped",
        metadata: {
          waveformReady: false,
          sourceStoragePath: storageObject.storagePath,
          reason: "FFmpeg is unavailable or waveform extraction failed.",
        },
      }];
    }
    const pcm = await fs.readFile(pcmPath);
    const samples = Math.floor(pcm.length / 2);
    const bucketCount = Math.min(1024, Math.max(1, samples));
    const bucketSize = Math.max(1, Math.floor(samples / bucketCount));
    const normalizedPeaks: number[] = [];
    for (let bucket = 0; bucket < bucketCount; bucket += 1) {
      let max = 0;
      const start = bucket * bucketSize;
      const end = Math.min(samples, start + bucketSize);
      for (let sample = start; sample < end; sample += 1) {
        const value = Math.abs(pcm.readInt16LE(sample * 2));
        if (value > max) max = value;
      }
      normalizedPeaks.push(Number((max / 32768).toFixed(4)));
    }
    const waveform = {
      version: 1,
      sampleCount: normalizedPeaks.length,
      channelsCombined: true,
      normalizedPeaks,
      sourceStorageObjectId: storageObject.storageObjectId,
      generatedAt: new Date().toISOString(),
    };
    const jsonPath = `${workspace}/waveform.json`;
    await fs.writeFile(jsonPath, JSON.stringify(waveform));
    const outputStoragePath = buildProcessingOutputStoragePath(storageObject, "audio_waveform_json", "json");
    const outputStorageObject = await createStorageObjectFromLocalFile({
      source: storageObject,
      localFilePath: jsonPath,
      storagePath: outputStoragePath,
      mimeType: "application/json",
      outputType: "audio_waveform_json",
      metadata: { waveformReady: true, fullSongPrivate: storageObject.assetType === "full_song" },
    });
    return [{
      outputId: `output-${Date.now()}-waveform-json`,
      outputType: "audio_waveform_json",
      storageObjectId: outputStorageObject.storageObjectId,
      storagePath: outputStorageObject.storagePath,
      mimeType: outputStorageObject.mimeType,
      fileSizeBytes: outputStorageObject.fileSizeBytes,
      checksum: outputStorageObject.checksum,
      status: "ready",
      metadata: {
        waveformReady: true,
        accessLevel: outputStorageObject.accessLevel,
        sampleCount: normalizedPeaks.length,
        fullSongPrivate: storageObject.assetType === "full_song",
      },
    }];
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
};
