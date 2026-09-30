import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import type { MediaUploadApiResult } from "../../models/mediaModels";
import { backendStorageProviderRegistry } from "../../storage/StorageProviderRegistry";
import { calculateSha256 } from "../../utils/media/mediaChecksumUtils";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";
import { sanitizeFileName, resolveInsideRoot } from "../../utils/media/mediaPathUtils";
import { runExternalProcess } from "../../utils/media/externalProcessUtils";
import { mediaAssetPersistenceService } from "./MediaAssetPersistenceService";
import { mediaAuditPersistenceService } from "./MediaAuditPersistenceService";
import { mediaStoragePersistenceService } from "./MediaStoragePersistenceService";
import { mediaUploadApiService } from "./MediaUploadApiService";

export interface AudioPreviewGenerationOptions {
  actorId?: string;
  durationSeconds?: number;
  startSeconds?: number;
  title?: string;
}

const clampPreviewDuration = (value: unknown): number => {
  const duration = typeof value === "number" && Number.isFinite(value) ? value : 30;
  return Math.min(30, Math.max(5, Math.round(duration)));
};

const clampStart = (value: unknown): number => {
  const start = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.round(start));
};

const getFfmpegExecutable = (): string =>
  process.env.FFMPEG_PATH?.trim() || "ffmpeg";

const mp3NameFor = (fileName: string): string => {
  const base = sanitizeFileName(fileName).replace(/\.[a-z0-9]+$/i, "") || "audio-preview";
  return `${base}-30s-preview.mp3`;
};

const wavNameFor = (fileName: string): string => {
  const base = sanitizeFileName(fileName).replace(/\.[a-z0-9]+$/i, "") || "audio-preview";
  return `${base}-30s-preview.wav`;
};

const findChunk = (buffer: Buffer, chunkId: string): { offset: number; size: number; dataOffset: number } | null => {
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    if (id === chunkId) return { offset, size, dataOffset };
    offset = dataOffset + size + (size % 2);
  }
  return null;
};

const createPcmWavPreview = async (inputPath: string, options: { startSeconds: number; durationSeconds: number }): Promise<Buffer> => {
  const source = await fs.readFile(inputPath);
  if (source.toString("ascii", 0, 4) !== "RIFF" || source.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Only PCM WAV fallback preview generation is supported without FFmpeg.");
  }
  const fmt = findChunk(source, "fmt ");
  const data = findChunk(source, "data");
  if (!fmt || !data) throw new Error("WAV file is missing fmt or data chunks.");
  const audioFormat = source.readUInt16LE(fmt.dataOffset);
  const sampleRate = source.readUInt32LE(fmt.dataOffset + 4);
  const blockAlign = source.readUInt16LE(fmt.dataOffset + 12);
  if (audioFormat !== 1) throw new Error("Only uncompressed PCM WAV files can be previewed without FFmpeg.");
  if (!sampleRate || !blockAlign) throw new Error("WAV file has invalid sample rate or block alignment.");

  const dataStart = data.dataOffset;
  const dataEnd = data.dataOffset + data.size;
  const startByte = dataStart + Math.min(data.size, Math.floor(options.startSeconds * sampleRate) * blockAlign);
  const maxBytes = Math.floor(options.durationSeconds * sampleRate) * blockAlign;
  const endByte = Math.min(dataEnd, startByte + maxBytes);
  if (endByte <= startByte) throw new Error("Selected preview range is outside the full song audio.");
  const previewData = source.subarray(startByte, endByte);
  const fmtData = source.subarray(fmt.dataOffset, fmt.dataOffset + fmt.size);
  const outputSize = 4 + (8 + fmtData.length) + (8 + previewData.length);
  const output = Buffer.alloc(8 + outputSize);
  let cursor = 0;
  output.write("RIFF", cursor); cursor += 4;
  output.writeUInt32LE(outputSize, cursor); cursor += 4;
  output.write("WAVE", cursor); cursor += 4;
  output.write("fmt ", cursor); cursor += 4;
  output.writeUInt32LE(fmtData.length, cursor); cursor += 4;
  fmtData.copy(output, cursor); cursor += fmtData.length;
  output.write("data", cursor); cursor += 4;
  output.writeUInt32LE(previewData.length, cursor); cursor += 4;
  previewData.copy(output, cursor);
  return output;
};

export class AudioPreviewGenerationService {
  async generateFromFullSongAsset(fullSongAssetId: string, options: AudioPreviewGenerationOptions = {}): Promise<MediaUploadApiResult> {
    const fullSongAsset = await mediaAssetPersistenceService.get(fullSongAssetId);
    if (!fullSongAsset) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Full song media asset was not found.", 404, "database");
    if (fullSongAsset.assetType !== "full_song") {
      throw new MediaApiError("MEDIA_TARGET_INVALID", "Audio preview generation requires a full song asset.", 400, "validation");
    }

    const storageObjects = await mediaStoragePersistenceService.list();
    const sourceStorageObject = storageObjects.find((object) =>
      object.storageObjectId === fullSongAsset.metadata?.storageObjectId ||
      (object.assetId === fullSongAsset.assetId && object.assetType === "full_song" && object.status !== "deleted")
    );
    if (!sourceStorageObject) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Full song storage object was not found.", 404, "database");
    if (sourceStorageObject.accessLevel === "public" || sourceStorageObject.publicUrl) {
      throw new MediaApiError("MEDIA_PERMISSION_DENIED", "Full song source must remain private while generating previews.", 403, "storage");
    }

    const provider = backendStorageProviderRegistry.getActiveProvider();
    if (provider.getProviderName() !== "local") {
      throw new MediaApiError("MEDIA_STORAGE_FAILED", "Preview generation currently requires local development storage.", 501, "storage");
    }

    const durationSeconds = clampPreviewDuration(options.durationSeconds);
    const startSeconds = clampStart(options.startSeconds);
    const inputPath = resolveInsideRoot(mediaBackendConfig.uploadRoot, sourceStorageObject.storagePath);
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "anm-audio-preview-"));
    let outputFileName = mp3NameFor(sourceStorageObject.originalFileName || sourceStorageObject.fileName);
    let mimeType = "audio/mpeg";
    const outputPath = path.join(tempDir, outputFileName);
    const ffmpeg = getFfmpegExecutable();

    try {
      const processResult = await runExternalProcess(ffmpeg, [
        "-y",
        "-ss",
        String(startSeconds),
        "-t",
        String(durationSeconds),
        "-i",
        inputPath,
        "-vn",
        "-acodec",
        "libmp3lame",
        "-b:a",
        mediaBackendConfig.mediaAudioPreviewBitrate,
        outputPath,
      ], { timeoutMs: 120_000 });

      let buffer: Buffer;
      if (processResult.exitCode === 0) {
        buffer = await fs.readFile(outputPath);
      } else {
        try {
          outputFileName = wavNameFor(sourceStorageObject.originalFileName || sourceStorageObject.fileName);
          mimeType = "audio/wav";
          buffer = await createPcmWavPreview(inputPath, { startSeconds, durationSeconds });
        } catch (fallbackError) {
          throw new MediaApiError(
            "MEDIA_PROCESSING_FAILED",
            processResult.timedOut
              ? "Audio preview generation timed out."
              : fallbackError instanceof Error
                ? `FFmpeg is unavailable and WAV fallback failed: ${fallbackError.message}`
                : "FFmpeg is unavailable and WAV fallback failed.",
            500,
            "processing",
            true,
          );
        }
      }
      const checksum = calculateSha256(buffer);
      const result = await mediaUploadApiService.uploadSingle({
        fieldName: "file",
        fileName: outputFileName,
        mimeType,
        size: buffer.byteLength,
        buffer,
      }, {
        targetType: "release",
        targetId: fullSongAsset.ownerId || "temp",
        ownerType: "release",
        ownerId: fullSongAsset.ownerId,
        assetType: "audio_preview",
        intendedUse: "release_audio_preview",
        accessLevel: "public",
        title: options.title?.trim() || `${fullSongAsset.title.replace(/\s+Full Song$/i, "")} 30s Audio Preview`,
        description: `Generated ${durationSeconds}-second preview from private full song asset.`,
        metadata: {
          generatedFromFullSongAssetId: fullSongAsset.assetId,
          generatedFromStorageObjectId: sourceStorageObject.storageObjectId,
          previewStartSeconds: startSeconds,
          previewDurationSeconds: durationSeconds,
          checksum,
        },
      }, options.actorId ?? fullSongAsset.createdBy ?? "system");

      await mediaAuditPersistenceService.record("audio_preview_generated_from_full_song", "Generated audio preview from full song asset", {
        actorId: options.actorId,
        entityType: "media_asset",
        entityId: fullSongAsset.assetId,
        metadata: {
          previewAssetId: result.mediaAsset?.assetId ?? null,
          previewStorageObjectId: result.storageObject?.storageObjectId ?? null,
          durationSeconds,
          startSeconds,
        },
      });
      return result;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

export const audioPreviewGenerationService = new AudioPreviewGenerationService();
