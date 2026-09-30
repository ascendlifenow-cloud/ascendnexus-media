import type { MediaAssetRecord, MediaAssetType } from "../../models/admin";
import type { MediaUploadIntendedUse, MediaUploadResult, MediaUploadTarget } from "../../models/media";
import type { GalleryMediaType } from "../../models/gallery";
import type { AdminGalleryFormState } from "./adminGalleryFormUtils";

export const galleryImageAccept = "image/jpeg,image/png,image/webp";

const galleryMediaUploadMap: Record<GalleryMediaType, { assetType: MediaAssetType; intendedUse: MediaUploadIntendedUse }> = {
  cover_art: { assetType: "cover_art", intendedUse: "gallery_cover_art" },
  artist_profile: { assetType: "artist_profile", intendedUse: "gallery_artist_profile" },
  promo_graphic: { assetType: "promo_graphic", intendedUse: "gallery_promo_graphic" },
  video_thumbnail: { assetType: "video_thumbnail", intendedUse: "gallery_video_thumbnail" },
  image: { assetType: "gallery_image", intendedUse: "gallery_image" },
  custom: { assetType: "custom_image", intendedUse: "gallery_custom_image" },
};

export const mapGalleryMediaTypeToAssetType = (mediaType: GalleryMediaType): MediaAssetType =>
  galleryMediaUploadMap[mediaType]?.assetType ?? "gallery_image";

export const buildGalleryImageAssetTitle = (title: string): string => {
  const galleryTitle = title.trim();
  return galleryTitle ? `${galleryTitle} Gallery Image` : "Gallery Image";
};

export const buildGalleryImageUploadTarget = (state: AdminGalleryFormState): MediaUploadTarget => {
  const galleryItemId = state.galleryItemId?.trim();
  const mapping = galleryMediaUploadMap[state.mediaType] ?? galleryMediaUploadMap.image;
  return {
    targetType: "gallery",
    targetId: galleryItemId || "temp",
    ownerType: "gallery",
    ownerId: galleryItemId || undefined,
    assetType: mapping.assetType,
    intendedUse: mapping.intendedUse,
    accessLevel: "admin_only",
    metadata: {
      galleryItemId: galleryItemId ?? null,
      pendingGalleryFormUpload: !galleryItemId,
      mediaType: state.mediaType,
      sourceType: state.sourceType,
      sourceId: state.sourceId.trim() || null,
    },
  };
};

export interface GalleryImageFieldPatch {
  imageUrl: string;
  thumbnailUrl: string;
  mediaAssetId: string;
  storageObjectId: string;
  originalFileName: string;
  previousGalleryAssetIdsInput: string;
  pendingGalleryAssignment: boolean;
  altText?: string;
}

const getUploadUrl = (result: MediaUploadResult): string =>
  result.mediaAsset?.url || result.publicUrl || result.storageObject?.publicUrl || "";

export const mapGalleryUploadResultToGalleryFields = (
  result: MediaUploadResult,
  state: AdminGalleryFormState,
): GalleryImageFieldPatch | null => {
  const url = getUploadUrl(result);
  if (!url.trim()) return null;
  const nextAssetId = result.mediaAsset?.assetId ?? "";
  const previousIds = new Set(state.previousGalleryAssetIdsInput.split(",").map((item) => item.trim()).filter(Boolean));
  if (state.mediaAssetId.trim() && nextAssetId && state.mediaAssetId.trim() !== nextAssetId) previousIds.add(state.mediaAssetId.trim());
  return {
    imageUrl: url,
    thumbnailUrl: result.mediaAsset?.thumbnailUrl || url,
    mediaAssetId: nextAssetId,
    storageObjectId: result.storageObject?.storageObjectId ?? result.storageObjectId ?? "",
    originalFileName: result.storageObject?.originalFileName ?? result.storageObject?.fileName ?? "",
    previousGalleryAssetIdsInput: [...previousIds].join(", "),
    pendingGalleryAssignment: !state.galleryItemId?.trim(),
    altText: result.mediaAsset?.altText || undefined,
  };
};

export const mapGalleryAssetToGalleryFields = (
  asset: MediaAssetRecord,
  state: AdminGalleryFormState,
): GalleryImageFieldPatch | null => {
  const url = asset.url || asset.largeUrl || asset.thumbnailUrl || "";
  if (!url.trim()) return null;
  const previousIds = new Set(state.previousGalleryAssetIdsInput.split(",").map((item) => item.trim()).filter(Boolean));
  if (state.mediaAssetId.trim() && state.mediaAssetId.trim() !== asset.assetId) previousIds.add(state.mediaAssetId.trim());
  const originalFileName = typeof asset.metadata?.originalFileName === "string"
    ? asset.metadata.originalFileName
    : typeof asset.metadata?.fileName === "string"
      ? asset.metadata.fileName
      : "";
  return {
    imageUrl: url,
    thumbnailUrl: asset.thumbnailUrl || url,
    mediaAssetId: asset.assetId,
    storageObjectId: typeof asset.metadata?.storageObjectId === "string" ? asset.metadata.storageObjectId : "",
    originalFileName,
    previousGalleryAssetIdsInput: [...previousIds].join(", "),
    pendingGalleryAssignment: !state.galleryItemId?.trim(),
    altText: asset.altText || undefined,
  };
};

export const getGalleryUploadAssetInfo = (state: AdminGalleryFormState) => ({
  assetId: state.mediaAssetId.trim() || null,
  storageObjectId: state.storageObjectId.trim() || null,
  originalFileName: state.originalFileName.trim() || null,
  pendingAssignment: isGalleryUploadPendingAssignment(state),
  hasImage: Boolean(state.imageUrl.trim()),
  hasPreviousAssets: Boolean(state.previousGalleryAssetIdsInput.trim()),
});

export const validateGalleryImageReadiness = (state: AdminGalleryFormState): string[] => {
  const warnings: string[] = [];
  if (!state.imageUrl.trim()) warnings.push("Gallery image is missing.");
  if (state.pendingGalleryAssignment) warnings.push("Uploaded gallery image is pending gallery item assignment until this item is saved.");
  if ((state.sourceType === "artist" || state.sourceType === "release") && !state.sourceId.trim()) {
    warnings.push("Source-linked gallery items need a source before publishing.");
  }
  return warnings;
};

export const isGalleryUploadPendingAssignment = (state: AdminGalleryFormState): boolean =>
  Boolean(state.pendingGalleryAssignment || (state.mediaAssetId.trim() && !state.galleryItemId?.trim()));
