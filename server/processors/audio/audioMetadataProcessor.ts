import type { MediaProcessingJobOutput, MediaStorageObject } from "../../models/mediaModels";
import { backendStorageProviderRegistry } from "../../storage/StorageProviderRegistry";
import { runExternalProcess } from "../../utils/media/externalProcessUtils";
import { resolveLocalStorageObjectPath } from "../../utils/media/processingStorageUtils";

interface FfprobeOutput {
  format?: {
    format_name?: string;
    format_long_name?: string;
    duration?: string;
    bit_rate?: string;
    size?: string;
    tags?: Record<string, string>;
  };
  streams?: Array<{
    codec_type?: string;
    codec_name?: string;
    codec_long_name?: string;
    bit_rate?: string;
    sample_rate?: string;
    channels?: number;
    channel_layout?: string;
    sample_fmt?: string;
  }>;
}

export const processAudioMetadata = async (storageObject: MediaStorageObject): Promise<MediaProcessingJobOutput[]> => {
  const exists = await backendStorageProviderRegistry.getActiveProvider().fileExists(storageObject.storagePath);
  if (!exists.exists) throw new Error("PROCESSING_SOURCE_NOT_FOUND: source audio was not found.");
  const localPath = resolveLocalStorageObjectPath(storageObject);
  const result = await runExternalProcess("ffprobe", [
    "-v", "error",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    localPath,
  ], { timeoutMs: 20000 });
  if (result.exitCode !== 0) {
    throw new Error(`PROCESSING_TOOL_UNAVAILABLE: ffprobe is required for audio metadata. ${result.stderr || ""}`.trim());
  }
  const parsed = JSON.parse(result.stdout || "{}") as FfprobeOutput;
  const audioStream = parsed.streams?.find((stream) => stream.codec_type === "audio");
  const durationSeconds = Number.parseFloat(parsed.format?.duration ?? "0");
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error("PROCESSING_AUDIO_METADATA_FAILED: valid duration unavailable.");
  return [{
    outputId: `output-${Date.now()}-audio-metadata`,
    outputType: "metadata",
    storageObjectId: storageObject.storageObjectId,
    mimeType: storageObject.mimeType,
    fileSizeBytes: storageObject.fileSizeBytes,
    durationSeconds,
    status: "ready",
    metadata: {
      sourceStoragePath: storageObject.storagePath,
      ffprobeAvailable: true,
      durationSeconds,
      formatName: parsed.format?.format_name,
      formatLongName: parsed.format?.format_long_name,
      codecName: audioStream?.codec_name,
      codecLongName: audioStream?.codec_long_name,
      bitrate: Number.parseInt(audioStream?.bit_rate ?? parsed.format?.bit_rate ?? "0", 10) || undefined,
      sampleRate: Number.parseInt(audioStream?.sample_rate ?? "0", 10) || undefined,
      channels: audioStream?.channels,
      channelLayout: audioStream?.channel_layout,
      sampleFormat: audioStream?.sample_fmt,
      streamCount: parsed.streams?.length ?? 0,
      publicPlaybackAllowed: storageObject.assetType !== "full_song",
      metadataVersion: 1,
    },
  }];
};
