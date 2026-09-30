import type { MediaAssetMetadataValue, MediaAssetRecord } from "../../models/admin";
import type { MediaUploadResult, MediaUploadTarget } from "../../models/media";
import type { AdminReleaseFormState } from "./adminReleaseFormUtils";

export const releaseCoverArtAccept = "image/jpeg,image/png,image/webp";

export const buildCoverArtAssetTitle = (releaseTitle: string, fileName?: string): string => {
  const title = releaseTitle.trim();
  if (title) return `${title} Cover Art`;
  return fileName?.trim() ? `${fileName.trim()} Cover Art` : "Release Cover Art";
};

export const buildReleaseCoverArtUploadTarget = (state: AdminReleaseFormState): MediaUploadTarget => {
  const releaseId = state.releaseId?.trim();
  return {
    targetType: "release",
    targetId: releaseId || "temp",
    ownerType: "release",
    ownerId: releaseId || undefined,
    assetType: "cover_art",
    intendedUse: "release_cover_art",
    accessLevel: "public",
    metadata: {
      releaseId: releaseId ?? null,
      pendingReleaseFormUpload: !releaseId,
      releaseTitle: state.title.trim() || null,
    },
  };
};

export interface CoverArtReleaseFieldPatch {
  coverArtUrl: string;
  coverArtThumbnailUrl: string;
  coverArtLargeUrl: string;
  coverArtAlt: string;
  coverArtAssetId: string;
  coverArtStorageObjectId: string;
  previousCoverArtAssetIdsInput: string;
  pendingCoverArtAssignment: boolean;
}

const metadataValueToString = (value: MediaAssetMetadataValue | undefined): string =>
  typeof value === "string" ? value : "";

const metadataObjectValueToString = (value: MediaAssetMetadataValue | undefined, key: string): string => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const nested = value[key];
  return typeof nested === "string" ? nested : "";
};

const toPublicMediaBrowserUrl = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (isPublicDeliveryMediaUrl(trimmed)) return trimmed;
  if (trimmed.startsWith("public/")) return `/uploads/media/public/${trimmed}`;
  return undefined;
};

export const isPublicDeliveryMediaUrl = (value: string | undefined): boolean =>
  Boolean(value && (value.startsWith("https://") || value.startsWith("http://") || value.startsWith("/uploads/media/public") || value.startsWith("data:image/")));

const firstPublicSafeUrl = (...values: Array<string | undefined>): string =>
  values.map(toPublicMediaBrowserUrl).find(isPublicDeliveryMediaUrl) ?? "";

const firstUsableUrl = (...values: Array<string | undefined>): string =>
  firstPublicSafeUrl(...values) || values.map((value) => value?.trim() ?? "").find(Boolean) || "";

const getMediaAssetPublicUrl = (mediaAsset: MediaAssetRecord): string =>
  firstUsableUrl(
    mediaAsset.url,
    mediaAsset.largeUrl,
    mediaAsset.thumbnailUrl,
    metadataValueToString(mediaAsset.metadata?.publicUrl),
    metadataValueToString(mediaAsset.metadata?.publicCdnUrl),
    metadataObjectValueToString(mediaAsset.metadata?.storage, "publicUrl"),
    metadataObjectValueToString(mediaAsset.metadata?.storage, "publicCdnUrl"),
    metadataObjectValueToString(mediaAsset.metadata?.storage, "storagePath"),
  );

export const mapCoverArtUploadResultToReleaseFields = (
  result: MediaUploadResult,
  currentState: AdminReleaseFormState,
): CoverArtReleaseFieldPatch | null => {
  const mediaAsset = result.mediaAsset;
  const storageObject = result.storageObject;
  const url = firstUsableUrl(
    mediaAsset ? getMediaAssetPublicUrl(mediaAsset) : undefined,
    result.publicUrl,
    storageObject?.publicUrl,
    storageObject?.signedUrl,
    storageObject?.storagePath,
  );
  if (!url.trim()) return null;

  const currentAssetId = currentState.coverArtAssetId.trim();
  const nextAssetId = mediaAsset?.assetId ?? "";
  const previousIds = new Set(
    currentState.previousCoverArtAssetIdsInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
  if (currentAssetId && nextAssetId && currentAssetId !== nextAssetId) previousIds.add(currentAssetId);

  return {
    coverArtUrl: url,
    coverArtThumbnailUrl: firstUsableUrl(mediaAsset?.thumbnailUrl, url),
    coverArtLargeUrl: firstUsableUrl(mediaAsset?.largeUrl, url),
    coverArtAlt: metadataValueToString(mediaAsset?.metadata?.coverArtAlt) || currentState.coverArtAlt,
    coverArtAssetId: nextAssetId,
    coverArtStorageObjectId: storageObject?.storageObjectId ?? result.storageObjectId ?? "",
    previousCoverArtAssetIdsInput: [...previousIds].join(", "),
    pendingCoverArtAssignment: !currentState.releaseId?.trim(),
  };
};

export const mapCoverArtAssetToReleaseFields = (
  mediaAsset: MediaAssetRecord,
  currentState: AdminReleaseFormState,
): CoverArtReleaseFieldPatch | null => {
  const url = getMediaAssetPublicUrl(mediaAsset);
  if (!url.trim()) return null;

  const currentAssetId = currentState.coverArtAssetId.trim();
  const previousIds = new Set(
    currentState.previousCoverArtAssetIdsInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
  if (currentAssetId && currentAssetId !== mediaAsset.assetId) previousIds.add(currentAssetId);

  return {
    coverArtUrl: url,
    coverArtThumbnailUrl: firstUsableUrl(mediaAsset.thumbnailUrl, url),
    coverArtLargeUrl: firstUsableUrl(mediaAsset.largeUrl, url),
    coverArtAlt: mediaAsset.altText || currentState.coverArtAlt,
    coverArtAssetId: mediaAsset.assetId,
    coverArtStorageObjectId: metadataValueToString(mediaAsset.metadata?.publicStorageObjectId) || metadataValueToString(mediaAsset.metadata?.storageObjectId),
    previousCoverArtAssetIdsInput: [...previousIds].join(", "),
    pendingCoverArtAssignment: !currentState.releaseId?.trim() || mediaAsset.ownerId !== currentState.releaseId,
  };
};

export const getReleaseCoverArtAssetInfo = (state: AdminReleaseFormState) => ({
  assetId: state.coverArtAssetId.trim() || null,
  storageObjectId: state.coverArtStorageObjectId.trim() || null,
  pendingAssignment: isCoverArtUploadPendingAssignment(state),
  hasCoverArt: Boolean(state.coverArtUrl.trim()),
  hasPreviousAssets: Boolean(state.previousCoverArtAssetIdsInput.trim()),
});

export const validateReleaseCoverArtReadiness = (state: AdminReleaseFormState): string[] => {
  const warnings: string[] = [];
  if (!state.coverArtUrl.trim()) warnings.push("Cover art is missing.");
  if (state.pendingCoverArtAssignment) warnings.push("Uploaded cover art is pending release assignment until this release is saved.");
  if (state.coverArtAssetId.trim() && state.status === "published" && !/^https?:\/\//i.test(state.coverArtUrl) && !state.coverArtUrl.startsWith("/")) {
    warnings.push("Published release cover art should use a public-safe URL.");
  }
  return warnings;
};

export const isCoverArtUploadPendingAssignment = (state: AdminReleaseFormState): boolean =>
  Boolean(state.pendingCoverArtAssignment || (state.coverArtAssetId.trim() && !state.releaseId?.trim()));
