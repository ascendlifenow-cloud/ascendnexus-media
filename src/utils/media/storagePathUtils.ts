import type { MediaUploadTarget } from "../../models/media";
import type { MediaStorageObject, StorageProviderName } from "../../models/media";
import { getFileExtension, safeFileNameWithTimestamp } from "./fileNameUtils";

export const normalizeStorageProviderName = (provider: string | null | undefined): StorageProviderName => {
  if (provider === "local" || provider === "s3" || provider === "r2" || provider === "supabase" || provider === "firebase" || provider === "custom") return provider;
  return "custom";
};

export const safeJoinStoragePath = (...segments: Array<string | number | null | undefined>): string => {
  const safeSegments = segments
    .map((segment) => String(segment ?? "").trim())
    .filter(Boolean)
    .flatMap((segment) => segment.split("/"))
    .map((segment) =>
      segment
        .replace(/\\/g, "/")
        .replace(/\.\.+/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^[-.]+|[-.]+$/g, ""),
    )
    .filter(Boolean);

  return `/${safeSegments.join("/")}`;
};

const getTargetBaseSegments = (target: MediaUploadTarget): string[] => {
  const targetId = target.targetId ?? target.ownerId ?? "unassigned";
  if (target.targetType === "artist") {
    if (target.assetType === "artist_profile") return ["artists", targetId, "profile"];
    if (target.assetType === "artist_character_art") return ["artists", targetId, "character-art"];
    if (target.assetType === "artist_banner") return ["artists", targetId, "banner"];
    return ["artists", targetId, target.assetType];
  }
  if (target.targetType === "release") {
    if (target.assetType === "cover_art") return ["releases", targetId, "cover-art"];
    if (target.assetType === "audio_preview") return ["releases", targetId, "audio-preview"];
    if (target.assetType === "full_song") return ["releases", targetId, "full-song"];
    return ["releases", targetId, target.assetType];
  }
  if (target.targetType === "gallery") return ["gallery", targetId, target.assetType];
  if (target.targetType === "homepage") return ["site", "homepage", target.intendedUse];
  if (target.targetType === "site_config") {
    if (target.assetType === "logo") return ["site", "logo"];
    if (target.assetType === "social_preview") return ["site", "social"];
    if (target.assetType === "fallback_image") return ["site", "fallbacks"];
    return ["site", target.assetType];
  }
  if (target.targetType === "seo_metadata" || target.targetType === "social_metadata") return ["site", "social", targetId];
  if (target.targetType === "media_library") return ["media-library", "unassigned", target.assetType];
  return ["media-library", "custom", target.assetType];
};

export const buildMediaStoragePath = (
  uploadTarget: MediaUploadTarget,
  file: Pick<File, "name"> | { name: string },
  timestamp = Date.now(),
): string => {
  const fileName = safeFileNameWithTimestamp(file.name, timestamp);
  return safeJoinStoragePath(...getTargetBaseSegments(uploadTarget), fileName);
};

export const generateStorageObjectId = (prefix = "storage"): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const generateAssetId = (uploadTarget: MediaUploadTarget): string => {
  const targetId = uploadTarget.targetId ?? uploadTarget.ownerId ?? "unassigned";
  return `asset-${uploadTarget.assetType}-${targetId}-${Date.now().toString(36)}`;
};

export const isPublicAccessAllowed = (storageObject: Pick<MediaStorageObject, "accessLevel" | "status">): boolean =>
  storageObject.accessLevel === "public" && storageObject.status === "ready";

export const getStoragePathExtension = (storagePath: string): string => getFileExtension(storagePath);
