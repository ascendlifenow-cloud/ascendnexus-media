import type { MediaAssetType } from "../../models/admin";
import type { AudioAssetMetadata } from "../../models/media";
import { getFileExtension } from "./fileNameUtils";
import { getAudioLengthWarning } from "./audioDurationUtils";

export interface AudioAnalysisOptions {
  assetType?: MediaAssetType;
  publicPlaybackAllowed?: boolean;
}

export interface AudioAnalysisResult {
  success: boolean;
  metadata?: AudioAssetMetadata;
  errors?: string[];
  warnings?: string[];
}

const supportsAudioElement = (): boolean => typeof Audio !== "undefined";
const supportsObjectUrl = (): boolean => typeof URL !== "undefined" && typeof URL.createObjectURL === "function";

const getAudioFormat = (file: File): string | undefined => {
  if (file.type) return file.type.replace(/^audio\//, "");
  return getFileExtension(file.name) || undefined;
};

const isFullSongAssetType = (assetType?: MediaAssetType): boolean => assetType === "full_song";
const isPreviewAssetType = (assetType?: MediaAssetType): boolean => assetType === "audio_preview" || assetType === "custom_audio";

export const analyzeAudioFile = async (
  file: File | null | undefined,
  options: AudioAnalysisOptions = {},
): Promise<AudioAnalysisResult> => {
  if (!file) return { success: false, errors: ["Audio file is required."] };
  if (!file.type.startsWith("audio/")) return { success: false, errors: ["Only audio files can be analyzed."] };
  if (!supportsAudioElement() || !supportsObjectUrl()) {
    return { success: false, errors: ["Browser audio metadata APIs are unavailable."] };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const durationSeconds = await new Promise<number>((resolve, reject) => {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
      audio.onerror = () => reject(new Error("Audio metadata could not be read."));
      audio.src = objectUrl;
    });
    const isFullSong = isFullSongAssetType(options.assetType);
    const isPreview = isPreviewAssetType(options.assetType);
    const publicPlaybackAllowed = isFullSong ? false : Boolean(options.publicPlaybackAllowed ?? isPreview);
    const metadata: AudioAssetMetadata = {
      durationSeconds,
      format: getAudioFormat(file),
      mimeType: file.type,
      fileExtension: getFileExtension(file.name) || undefined,
      fileSizeBytes: file.size,
      isPreview,
      isFullSong,
      publicPlaybackAllowed,
      waveformReady: false,
      transcriptionReady: false,
      lyricsTimingReady: false,
      createdAt: new Date().toISOString(),
      metadata: {
        clientAnalyzed: true,
        bitrateReady: false,
        sampleRateReady: false,
        channelCountReady: false,
      },
    };
    const warning = getAudioLengthWarning(durationSeconds, options.assetType === "full_song" ? "full_song" : options.assetType === "audio_preview" ? "audio_preview" : "custom_audio");
    return {
      success: true,
      metadata,
      warnings: warning ? [warning] : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audio analysis failed.";
    return { success: false, errors: [message] };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const createFallbackAudioMetadata = (
  sourceUrl: string,
  assetType: MediaAssetType,
  publicPlaybackAllowed?: boolean,
): AudioAssetMetadata => {
  const isFullSong = assetType === "full_song";
  const isPreview = assetType === "audio_preview" || assetType === "custom_audio";
  return {
    isPreview,
    isFullSong,
    publicPlaybackAllowed: isFullSong ? false : Boolean(publicPlaybackAllowed ?? isPreview),
    waveformReady: false,
    transcriptionReady: false,
    lyricsTimingReady: false,
    createdAt: new Date().toISOString(),
    metadata: {
      analysisSkipped: true,
      sourceUrlAvailable: Boolean(sourceUrl),
    },
  };
};
