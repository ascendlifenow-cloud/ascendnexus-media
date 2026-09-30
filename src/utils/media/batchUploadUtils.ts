import type { MediaAssetMetadataValue, MediaAssetOwnerType, MediaAssetType } from "../../models/admin";
import type {
  MediaAccessLevel,
  MediaBatchFileItem,
  MediaBatchUploadOptions,
  MediaBatchUploadSession,
  MediaCategory,
  MediaUploadIntendedUse,
  MediaUploadTarget,
  MediaUploadTargetType,
} from "../../models/media";
import { defaultMediaBatchUploadOptions } from "../../models/media";
import { uploadSecurityService } from "../../services/security";
import { getMediaCategoryFromMimeType, isMediaAssetTypeCompatibleWithMimeType } from "./mediaTypeUtils";

export interface MediaBatchUploadSummary {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  completedFiles: number;
  failedFiles: number;
  canceledFiles: number;
  readyFiles: number;
  uploadingFiles: number;
  progress: number;
  status: MediaBatchUploadSession["status"];
}

export const mergeBatchUploadOptions = (options: Partial<MediaBatchUploadOptions> = {}): MediaBatchUploadOptions => ({
  ...defaultMediaBatchUploadOptions,
  ...options,
  metadata: uploadSecurityService.sanitizeUploadMetadata(options.metadata),
});

export const createBatchSessionId = (): string => `batch-session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
export const createBatchFileId = (): string => `batch-file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const inferBatchFileMediaCategory = (file: File | null | undefined): MediaCategory =>
  getMediaCategoryFromMimeType(file?.type ?? "");

export const getDefaultBatchAssetTypeForCategory = (category: MediaCategory): MediaAssetType => {
  if (category === "image") return "custom_image";
  if (category === "audio") return "custom_audio";
  if (category === "video") return "video";
  return "custom";
};

export const inferBatchFileAssetType = (
  file: File,
  options: MediaBatchUploadOptions,
): MediaAssetType => {
  if (options.defaultAssetType) return options.defaultAssetType;
  if (!options.autoInferAssetType) return "custom";
  return getDefaultBatchAssetTypeForCategory(inferBatchFileMediaCategory(file));
};

export const getBatchUploadIntendedUse = (assetType: MediaAssetType, options: MediaBatchUploadOptions): MediaUploadIntendedUse => {
  if (options.intendedUse) return options.intendedUse;
  if (assetType === "cover_art") return "release_cover_art";
  if (assetType === "audio_preview") return "release_audio_preview";
  if (assetType === "full_song") return "release_full_song";
  if (assetType === "artist_profile") return "artist_profile_image";
  if (assetType === "artist_character_art") return "artist_character_art";
  if (assetType === "artist_banner") return "artist_banner";
  if (assetType === "gallery_image") return "gallery_image";
  if (assetType === "promo_graphic") return "gallery_promo_graphic";
  if (assetType === "video_thumbnail") return "gallery_video_thumbnail";
  if (assetType === "logo") return "site_logo";
  if (assetType === "social_preview") return "social_preview_image";
  return "batch_upload";
};

const toPrimitiveMetadata = (
  metadata: Record<string, MediaAssetMetadataValue>,
): Record<string, string | number | boolean | null> =>
  Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, string | number | boolean | null] => {
      const value = entry[1];
      return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
    }),
  );

export const buildBatchUploadTarget = (
  fileItem: Pick<MediaBatchFileItem, "batchFileId" | "fileName" | "assetType">,
  options: MediaBatchUploadOptions,
  sessionId: string,
): MediaUploadTarget => {
  const metadata = uploadSecurityService.sanitizeUploadMetadata({
    ...(options.metadata ?? {}),
    batchSessionId: sessionId,
    batchFileId: fileItem.batchFileId,
    uploadedFrom: "batch_upload",
    originalFileName: fileItem.fileName,
    assignmentStatus: "unassigned",
  });
  return {
    targetType: (options.targetType ?? "media_library") as MediaUploadTargetType,
    ownerType: (options.ownerType ?? "media_library") as MediaAssetOwnerType,
    ownerId: options.ownerId,
    assetType: fileItem.assetType,
    intendedUse: getBatchUploadIntendedUse(fileItem.assetType, options),
    accessLevel: (options.accessLevel ?? "admin_only") as MediaAccessLevel,
    metadata: toPrimitiveMetadata(metadata),
  };
};

export const getBatchLevelValidationMessages = (
  files: readonly File[],
  options: MediaBatchUploadOptions,
): { errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!files.length) errors.push("Select at least one file for batch upload.");
  if (options.maxFiles && files.length > options.maxFiles) errors.push(`Batch upload is limited to ${options.maxFiles} files.`);
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (options.maxTotalSizeBytes && totalSize > options.maxTotalSizeBytes) errors.push("Selected files exceed the batch size limit.");
  const categories = new Set(files.map(inferBatchFileMediaCategory));
  if (!options.allowMixedMedia && categories.size > 1) errors.push("Mixed media batches are disabled for this upload.");
  const names = files.map((file) => file.name.trim().toLowerCase()).filter(Boolean);
  const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
  if (duplicateNames.length) warnings.push("Duplicate filenames detected. Sanitized storage paths will still be unique.");
  return { errors, warnings };
};

export const isBatchFileCompatible = (file: File, assetType: MediaAssetType): boolean =>
  isMediaAssetTypeCompatibleWithMimeType(assetType, file.type);

export const calculateBatchProgress = (files: readonly MediaBatchFileItem[]): number => {
  if (!files.length) return 0;
  return Math.round(files.reduce((sum, file) => sum + Math.max(0, Math.min(100, file.progress)), 0) / files.length);
};

export const getBatchSessionSummary = (session: MediaBatchUploadSession): MediaBatchUploadSummary => ({
  totalFiles: session.totalFiles,
  validFiles: session.validFiles,
  invalidFiles: session.invalidFiles,
  completedFiles: session.completedFiles,
  failedFiles: session.failedFiles,
  canceledFiles: session.canceledFiles,
  readyFiles: session.files.filter((file) => file.status === "ready" || file.status === "queued").length,
  uploadingFiles: session.files.filter((file) => file.status === "uploading" || file.status === "processing").length,
  progress: session.progress,
  status: session.status,
});

export const reconcileBatchSessionCounts = (session: MediaBatchUploadSession): MediaBatchUploadSession => {
  const files = session.files;
  const completedFiles = files.filter((file) => file.status === "completed").length;
  const failedFiles = files.filter((file) => file.status === "failed").length;
  const canceledFiles = files.filter((file) => file.status === "canceled").length;
  const invalidFiles = files.filter((file) => file.status === "validation_failed" || file.status === "skipped").length;
  const validFiles = files.filter((file) => !["validation_failed", "skipped"].includes(file.status)).length;
  const progress = calculateBatchProgress(files);
  return {
    ...session,
    totalFiles: files.length,
    validFiles,
    invalidFiles,
    completedFiles,
    failedFiles,
    canceledFiles,
    progress,
    uploadTargets: files.map((file) => file.uploadTarget),
    updatedAt: new Date().toISOString(),
  };
};
