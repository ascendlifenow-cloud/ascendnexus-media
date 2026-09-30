import type { MediaAssetRecord } from "../../models/admin";
import type { MediaUploadResult, MediaUploadTarget } from "../../models/media";
import type { AdminReleaseFormState } from "./adminReleaseFormUtils";

export type ReleaseAudioUploadKind = "audioPreview" | "fullSong";

export const releaseAudioAccept = "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg";

export const buildAudioAssetTitle = (releaseTitle: string, kind: ReleaseAudioUploadKind, fileName?: string): string => {
  const title = releaseTitle.trim();
  const suffix = kind === "audioPreview" ? "Audio Preview" : "Full Song";
  if (title) return `${title} ${suffix}`;
  return fileName?.trim() ? `${fileName.trim()} ${suffix}` : `Release ${suffix}`;
};

const getReleaseId = (state: AdminReleaseFormState): string | undefined => state.releaseId?.trim() || undefined;

export const buildReleaseAudioUploadTarget = (
  state: AdminReleaseFormState,
  kind: ReleaseAudioUploadKind = "audioPreview",
): MediaUploadTarget => {
  const releaseId = getReleaseId(state);
  return {
    targetType: "release",
    targetId: releaseId || "temp",
    ownerType: "release",
    ownerId: releaseId,
    assetType: kind === "audioPreview" ? "audio_preview" : "full_song",
    intendedUse: kind === "audioPreview" ? "release_audio_preview" : "release_full_song",
    accessLevel: "admin_only",
    metadata: {
      releaseId: releaseId ?? null,
      pendingReleaseFormUpload: !releaseId,
      releaseTitle: state.title.trim() || null,
      publicPlaybackAllowed: kind === "audioPreview" ? true : false,
    },
  };
};

export const buildReleaseFullSongUploadTarget = (state: AdminReleaseFormState): MediaUploadTarget =>
  buildReleaseAudioUploadTarget(state, "fullSong");

export interface AudioReleaseFieldPatch {
  audioPreviewUrl?: string;
  audioPreviewAssetId?: string;
  audioPreviewStorageObjectId?: string;
  audioPreviewOriginalFileName?: string;
  audioPreviewDuration?: string;
  audioPreviewFileSizeBytes?: string;
  audioPreviewMimeType?: string;
  previousAudioPreviewAssetIdsInput?: string;
  pendingAudioPreviewAssignment?: boolean;
  fullSongAssetId?: string;
  fullSongStorageObjectId?: string;
  fullSongUrl?: string;
  fullSongOriginalFileName?: string;
  fullSongDuration?: string;
  fullSongFileSizeBytes?: string;
  fullSongMimeType?: string;
  previousFullSongAssetIdsInput?: string;
  pendingFullSongAssignment?: boolean;
  fullSongPublicPlaybackAllowed?: boolean;
}

const getResultUrl = (result: MediaUploadResult): string =>
  result.mediaAsset?.url || result.publicUrl || result.storageObject?.publicUrl || result.storageObject?.signedUrl || result.storageObject?.storagePath || "";

const getOriginalFileName = (result: MediaUploadResult): string =>
  result.storageObject?.originalFileName || result.storageObject?.fileName || "";

const getAudioMetadataRecord = (result: MediaUploadResult): Record<string, unknown> | undefined => {
  const audio = result.mediaAsset?.metadata?.audio;
  if (!audio || typeof audio !== "object" || Array.isArray(audio)) return undefined;
  return audio as Record<string, unknown>;
};

const getAudioDuration = (result: MediaUploadResult): string => {
  const audioDuration = getAudioMetadataRecord(result)?.durationSeconds;
  if (typeof audioDuration === "number" && Number.isFinite(audioDuration)) return String(Math.round(audioDuration));
  const resultDuration = result.metadata?.audioDurationSeconds;
  if (typeof resultDuration === "number" && Number.isFinite(resultDuration)) return String(Math.round(resultDuration));
  return "";
};

const getAudioFileSize = (result: MediaUploadResult): string => {
  const metadataSize = getAudioMetadataRecord(result)?.fileSizeBytes;
  if (typeof metadataSize === "number" && Number.isFinite(metadataSize)) return String(metadataSize);
  return result.storageObject?.fileSizeBytes !== undefined ? String(result.storageObject.fileSizeBytes) : "";
};

const getAudioMimeType = (result: MediaUploadResult): string => {
  const metadataMime = getAudioMetadataRecord(result)?.mimeType;
  if (typeof metadataMime === "string") return metadataMime;
  return result.storageObject?.mimeType ?? "";
};

const getAssetMetadataString = (asset: MediaAssetRecord, key: string): string => {
  const value = asset.metadata?.[key];
  return typeof value === "string" ? value : "";
};

const getAssetMetadataNumberString = (asset: MediaAssetRecord, keys: string[]): string => {
  for (const key of keys) {
    const value = asset.metadata?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return String(Math.round(value));
  }
  const audio = asset.metadata?.audio;
  if (audio && typeof audio === "object" && !Array.isArray(audio)) {
    for (const key of keys) {
      const value = audio[key];
      if (typeof value === "number" && Number.isFinite(value)) return String(Math.round(value));
    }
  }
  return "";
};

const getAssetAudioFileSize = (asset: MediaAssetRecord): string => {
  const direct = asset.metadata?.fileSizeBytes;
  if (typeof direct === "number" && Number.isFinite(direct)) return String(direct);
  const audio = asset.metadata?.audio;
  if (audio && typeof audio === "object" && !Array.isArray(audio)) {
    const value = audio.fileSizeBytes;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
};

const getAssetAudioMimeType = (asset: MediaAssetRecord): string => {
  const direct = asset.metadata?.mimeType;
  if (typeof direct === "string") return direct;
  const audio = asset.metadata?.audio;
  if (audio && typeof audio === "object" && !Array.isArray(audio)) {
    const value = audio.mimeType;
    if (typeof value === "string") return value;
  }
  return "";
};

const collectPreviousIds = (currentIds: string, currentAssetId: string, nextAssetId: string): string => {
  const previousIds = new Set(currentIds.split(",").map((item) => item.trim()).filter(Boolean));
  if (currentAssetId && nextAssetId && currentAssetId !== nextAssetId) previousIds.add(currentAssetId);
  return [...previousIds].join(", ");
};

export const mapAudioUploadResultToReleaseFields = (
  result: MediaUploadResult,
  currentState: AdminReleaseFormState,
  kind: ReleaseAudioUploadKind = "audioPreview",
): AudioReleaseFieldPatch | null => {
  const url = getResultUrl(result);
  if (!url.trim()) return null;
  const nextAssetId = result.mediaAsset?.assetId ?? "";
  const storageObjectId = result.storageObject?.storageObjectId ?? result.storageObjectId ?? "";
  const originalFileName = getOriginalFileName(result);
  const duration = getAudioDuration(result);
  const fileSizeBytes = getAudioFileSize(result);
  const mimeType = getAudioMimeType(result);

  if (kind === "fullSong") {
    return {
      fullSongAssetId: nextAssetId,
      fullSongStorageObjectId: storageObjectId,
      fullSongUrl: url,
      fullSongOriginalFileName: originalFileName,
      fullSongDuration: duration,
      fullSongFileSizeBytes: fileSizeBytes,
      fullSongMimeType: mimeType,
      previousFullSongAssetIdsInput: collectPreviousIds(currentState.previousFullSongAssetIdsInput, currentState.fullSongAssetId.trim(), nextAssetId),
      pendingFullSongAssignment: !currentState.releaseId?.trim(),
      fullSongPublicPlaybackAllowed: false,
    };
  }

  return {
    audioPreviewUrl: url,
    audioPreviewAssetId: nextAssetId,
    audioPreviewStorageObjectId: storageObjectId,
    audioPreviewOriginalFileName: originalFileName,
    audioPreviewDuration: duration,
    audioPreviewFileSizeBytes: fileSizeBytes,
    audioPreviewMimeType: mimeType,
    previousAudioPreviewAssetIdsInput: collectPreviousIds(currentState.previousAudioPreviewAssetIdsInput, currentState.audioPreviewAssetId.trim(), nextAssetId),
    pendingAudioPreviewAssignment: !currentState.releaseId?.trim(),
  };
};

export const mapAudioAssetToReleaseFields = (
  asset: MediaAssetRecord,
  currentState: AdminReleaseFormState,
  kind: ReleaseAudioUploadKind = "audioPreview",
): AudioReleaseFieldPatch | null => {
  const url = asset.url || "";
  if (!url.trim()) return null;
  const storageObjectId = getAssetMetadataString(asset, "storageObjectId");
  const originalFileName = getAssetMetadataString(asset, "originalFileName") || getAssetMetadataString(asset, "sanitizedFileName");
  const duration = getAssetMetadataNumberString(asset, ["durationSeconds", "audioDurationSeconds"]);
  const fileSizeBytes = getAssetAudioFileSize(asset);
  const mimeType = getAssetAudioMimeType(asset);

  if (kind === "fullSong") {
    return {
      fullSongAssetId: asset.assetId,
      fullSongStorageObjectId: storageObjectId,
      fullSongUrl: url,
      fullSongOriginalFileName: originalFileName,
      fullSongDuration: duration,
      fullSongFileSizeBytes: fileSizeBytes,
      fullSongMimeType: mimeType,
      previousFullSongAssetIdsInput: collectPreviousIds(currentState.previousFullSongAssetIdsInput, currentState.fullSongAssetId.trim(), asset.assetId),
      pendingFullSongAssignment: !currentState.releaseId?.trim(),
      fullSongPublicPlaybackAllowed: false,
    };
  }

  return {
    audioPreviewUrl: url,
    audioPreviewAssetId: asset.assetId,
    audioPreviewStorageObjectId: storageObjectId,
    audioPreviewOriginalFileName: originalFileName,
    audioPreviewDuration: duration,
    audioPreviewFileSizeBytes: fileSizeBytes,
    audioPreviewMimeType: mimeType,
    previousAudioPreviewAssetIdsInput: collectPreviousIds(currentState.previousAudioPreviewAssetIdsInput, currentState.audioPreviewAssetId.trim(), asset.assetId),
    pendingAudioPreviewAssignment: !currentState.releaseId?.trim(),
  };
};

export const getReleaseAudioAssetInfo = (state: AdminReleaseFormState) => ({
  audioPreviewAssetId: state.audioPreviewAssetId.trim() || null,
  audioPreviewStorageObjectId: state.audioPreviewStorageObjectId.trim() || null,
  audioPreviewPendingAssignment: isAudioUploadPendingAssignment(state, "audioPreview"),
  hasAudioPreview: Boolean(state.audioPreviewUrl.trim()),
  hasPreviousAudioPreviewAssets: Boolean(state.previousAudioPreviewAssetIdsInput.trim()),
  fullSongAssetId: state.fullSongAssetId.trim() || null,
  fullSongStorageObjectId: state.fullSongStorageObjectId.trim() || null,
  fullSongPendingAssignment: isAudioUploadPendingAssignment(state, "fullSong"),
  hasFullSong: Boolean(state.fullSongAssetId.trim() || state.fullSongUrl.trim()),
  hasPreviousFullSongAssets: Boolean(state.previousFullSongAssetIdsInput.trim()),
  fullSongPublicPlaybackAllowed: isFullSongPublicPlaybackAllowed(state),
});

export const validateReleaseAudioReadiness = (state: AdminReleaseFormState): string[] => {
  const warnings: string[] = [];
  if (!state.audioPreviewUrl.trim()) warnings.push("Audio preview is missing.");
  if (state.pendingAudioPreviewAssignment) warnings.push("Uploaded audio preview is pending release assignment until this release is saved.");
  if (state.pendingFullSongAssignment) warnings.push("Uploaded full song audio is pending release assignment until this release is saved.");
  if (state.fullSongAssetId.trim() && !isFullSongPublicPlaybackAllowed(state)) warnings.push("Full song audio is stored admin-only and is not exposed publicly.");
  return warnings;
};

export const isAudioUploadPendingAssignment = (
  state: AdminReleaseFormState,
  kind: ReleaseAudioUploadKind = "audioPreview",
): boolean => {
  if (kind === "fullSong") return Boolean(state.pendingFullSongAssignment || (state.fullSongAssetId.trim() && !state.releaseId?.trim()));
  return Boolean(state.pendingAudioPreviewAssignment || (state.audioPreviewAssetId.trim() && !state.releaseId?.trim()));
};

export const isFullSongPublicPlaybackAllowed = (state: AdminReleaseFormState): boolean =>
  Boolean(state.fullSongPublicPlaybackAllowed);
