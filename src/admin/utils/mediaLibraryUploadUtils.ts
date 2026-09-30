import type { MediaAccessLevel, MediaCategory, MediaUploadResult, MediaUploadTarget } from "../../models/media";
import type { MediaAssetRecord, MediaAssetStatus, MediaAssetType } from "../../models/admin";
import { getMediaCategoryFromMimeType } from "../../utils/media/mediaTypeUtils";
import { sanitizeFileName } from "../../utils/media/fileNameUtils";

export type MediaLibraryAssetTypeSelection = MediaAssetType | "auto";
export type MediaLibraryAssignmentStatus = "unassigned" | "assigned" | "ready_for_assignment";

export const mediaLibraryUploadAssetTypes: MediaAssetType[] = [
  "cover_art",
  "artist_profile",
  "artist_character_art",
  "artist_banner",
  "promo_graphic",
  "gallery_image",
  "video_thumbnail",
  "social_preview",
  "logo",
  "custom_image",
  "audio_preview",
  "full_song",
  "custom_audio",
];

export interface MediaLibraryUploadOptions {
  selectedAssetType: MediaLibraryAssetTypeSelection;
  accessLevel?: MediaAccessLevel;
}

export interface MediaLibraryUploadBatchSummary {
  total: number;
  completed: number;
  failed: number;
  canceled: number;
  active: number;
}

export const inferMediaCategoryFromFile = (file: File | null | undefined): MediaCategory => {
  if (!file) return "custom";
  return getMediaCategoryFromMimeType(file.type || "");
};

export const getDefaultAssetTypeForMediaCategory = (category: MediaCategory): MediaAssetType => {
  if (category === "image") return "custom_image";
  if (category === "audio") return "custom_audio";
  if (category === "video") return "video";
  return "custom";
};

export const inferAssetTypeFromFile = (file: File | null | undefined): MediaAssetType =>
  getDefaultAssetTypeForMediaCategory(inferMediaCategoryFromFile(file));

export const buildMediaLibraryAssetTitle = (file: File | null | undefined): string => {
  if (!file?.name) return "Media Library Upload";
  return sanitizeFileName(file.name)
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || file.name;
};

export const buildMediaLibraryUploadTarget = (
  file: File | null | undefined,
  options: MediaLibraryUploadOptions,
): MediaUploadTarget => {
  const inferredMediaCategory = inferMediaCategoryFromFile(file);
  const inferredAssetType = inferAssetTypeFromFile(file);
  const selectedAssetType = options.selectedAssetType === "auto" ? inferredAssetType : options.selectedAssetType;
  return {
    targetType: "media_library",
    ownerType: "media_library",
    ownerId: undefined,
    assetType: selectedAssetType,
    intendedUse: "unassigned_upload",
    accessLevel: options.accessLevel ?? "admin_only",
    metadata: {
      uploadedFrom: "admin_media_library",
      inferredMediaCategory,
      inferredAssetType,
      selectedAssetType,
      assignmentStatus: "unassigned",
    },
  };
};

export const mapUploadResultToMediaLibraryAsset = (result: MediaUploadResult): MediaAssetRecord | null =>
  result.mediaAsset ?? null;

export const getMediaAssignmentStatus = (asset: MediaAssetRecord | null | undefined): MediaLibraryAssignmentStatus => {
  if (!asset) return "unassigned";
  const metadataStatus = asset.metadata?.assignmentStatus;
  if (metadataStatus === "assigned" || metadataStatus === "ready_for_assignment" || metadataStatus === "unassigned") {
    return metadataStatus;
  }
  if (asset.ownerType === "media_library" || !asset.ownerId || asset.ownerId === "unassigned") return "unassigned";
  return "assigned";
};

export const getMediaPublicSafetyLabel = (asset: MediaAssetRecord): string => {
  const status: MediaAssetStatus = asset.status;
  if (status !== "published") return "Not public: draft or archived";
  if (asset.ownerType === "media_library") return "Not public: unassigned library asset";
  return "Public-ready when linked content is public";
};

export const getUploadBatchSummary = (statuses: readonly string[]): MediaLibraryUploadBatchSummary => ({
  total: statuses.length,
  completed: statuses.filter((status) => status === "completed").length,
  failed: statuses.filter((status) => status === "failed").length,
  canceled: statuses.filter((status) => status === "canceled").length,
  active: statuses.filter((status) => ["validating", "ready", "queued", "uploading", "processing"].includes(status)).length,
});
