import type { MediaAssetRecord, MediaAssetType } from "../../models/admin";
import type { MediaUploadIntendedUse, MediaUploadResult, MediaUploadTarget } from "../../models/media";
import type { AdminArtistFormState } from "./adminArtistFormUtils";

export type ArtistArtworkUploadKind = "profileImage" | "thumbnailImage" | "characterArt" | "bannerImage";

export const artistArtworkAccept = "image/jpeg,image/png,image/webp";

const artworkConfig: Record<ArtistArtworkUploadKind, {
  label: string;
  assetType: MediaAssetType;
  intendedUse: MediaUploadIntendedUse;
  fieldUrl?: keyof AdminArtistFormState;
  assetField: keyof AdminArtistFormState;
  storageField: keyof AdminArtistFormState;
}> = {
  profileImage: {
    label: "Profile Image",
    assetType: "artist_profile",
    intendedUse: "artist_profile_image",
    fieldUrl: "profileImage",
    assetField: "profileImageAssetId",
    storageField: "profileImageStorageObjectId",
  },
  thumbnailImage: {
    label: "Thumbnail Image",
    assetType: "artist_profile",
    intendedUse: "artist_thumbnail_image",
    fieldUrl: "profileThumbnailUrl",
    assetField: "profileThumbnailAssetId",
    storageField: "profileThumbnailStorageObjectId",
  },
  characterArt: {
    label: "Character Art",
    assetType: "artist_character_art",
    intendedUse: "artist_character_art",
    fieldUrl: "characterArtUrl",
    assetField: "characterArtAssetId",
    storageField: "characterArtStorageObjectId",
  },
  bannerImage: {
    label: "Banner Image",
    assetType: "artist_banner",
    intendedUse: "artist_banner",
    fieldUrl: "profileBannerUrl",
    assetField: "profileBannerAssetId",
    storageField: "profileBannerStorageObjectId",
  },
};

export const getArtistArtworkLabel = (kind: ArtistArtworkUploadKind): string => artworkConfig[kind].label;

export const buildArtistArtworkAssetTitle = (
  displayName: string,
  kind: ArtistArtworkUploadKind,
  fileName?: string,
): string => {
  const name = displayName.trim();
  const label = getArtistArtworkLabel(kind);
  if (name) return `${name} ${label}`;
  return fileName?.trim() ? `${fileName.trim()} ${label}` : `Artist ${label}`;
};

export const buildArtistArtworkUploadTarget = (
  state: AdminArtistFormState,
  kind: ArtistArtworkUploadKind,
): MediaUploadTarget => {
  const artistId = state.artistId?.trim();
  const config = artworkConfig[kind];
  return {
    targetType: "artist",
    targetId: artistId || "temp",
    ownerType: "artist",
    ownerId: artistId || undefined,
    assetType: config.assetType,
    intendedUse: config.intendedUse,
    accessLevel: "admin_only",
    metadata: {
      artistId: artistId ?? null,
      pendingArtistFormUpload: !artistId,
      artistDisplayName: state.displayName.trim() || null,
      artworkKind: kind,
    },
  };
};

export const buildArtistProfileImageUploadTarget = (state: AdminArtistFormState): MediaUploadTarget =>
  buildArtistArtworkUploadTarget(state, "profileImage");

export const buildArtistCharacterArtUploadTarget = (state: AdminArtistFormState): MediaUploadTarget =>
  buildArtistArtworkUploadTarget(state, "characterArt");

export const buildArtistBannerUploadTarget = (state: AdminArtistFormState): MediaUploadTarget =>
  buildArtistArtworkUploadTarget(state, "bannerImage");

export type ArtistArtworkFieldPatch = Partial<Pick<
  AdminArtistFormState,
  | "profileImage"
  | "profileThumbnailUrl"
  | "profileBannerUrl"
  | "characterArtUrl"
  | "profileImageAssetId"
  | "profileImageStorageObjectId"
  | "profileThumbnailAssetId"
  | "profileThumbnailStorageObjectId"
  | "profileBannerAssetId"
  | "profileBannerStorageObjectId"
  | "characterArtAssetId"
  | "characterArtStorageObjectId"
  | "previousArtistImageAssetIdsInput"
  | "pendingArtistArtworkAssignment"
>>;

const getUploadUrl = (result: MediaUploadResult): string =>
  result.mediaAsset?.url || result.publicUrl || result.storageObject?.publicUrl || result.storageObject?.signedUrl || result.storageObject?.storagePath || "";

const getExistingAssetId = (state: AdminArtistFormState, kind: ArtistArtworkUploadKind): string =>
  String(state[artworkConfig[kind].assetField] ?? "").trim();

const getAssetStorageObjectId = (asset: MediaAssetRecord): string => {
  const value = asset.metadata?.storageObjectId;
  return typeof value === "string" ? value : "";
};

export const isArtistPublicDeliveryMediaUrl = (value: string | undefined): boolean =>
  Boolean(value && (value.startsWith("https://") || value.startsWith("http://") || value.startsWith("/uploads/media/public") || value.startsWith("data:image/")));

const metadataString = (asset: MediaAssetRecord, key: string): string => {
  const value = asset.metadata?.[key];
  return typeof value === "string" ? value : "";
};

const metadataObjectString = (asset: MediaAssetRecord, objectKey: string, key: string): string => {
  const object = asset.metadata?.[objectKey];
  if (!object || typeof object !== "object" || Array.isArray(object)) return "";
  const value = object[key];
  return typeof value === "string" ? value : "";
};

const toPublicMediaBrowserUrl = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (isArtistPublicDeliveryMediaUrl(trimmed)) return trimmed;
  if (trimmed.startsWith("public/")) return `/uploads/media/public/${trimmed}`;
  return undefined;
};

const firstPublicDeliveryUrl = (...values: Array<string | undefined>): string =>
  values.map(toPublicMediaBrowserUrl).find(isArtistPublicDeliveryMediaUrl) ?? "";

const getAssetUrlForArtwork = (asset: MediaAssetRecord, kind: ArtistArtworkUploadKind): string => {
  const publicUrl = firstPublicDeliveryUrl(
    asset.url,
    kind === "thumbnailImage" ? asset.thumbnailUrl : undefined,
    kind === "bannerImage" ? asset.largeUrl : undefined,
    asset.largeUrl,
    asset.thumbnailUrl,
    metadataString(asset, "publicUrl"),
    metadataString(asset, "publicCdnUrl"),
    metadataObjectString(asset, "storage", "publicUrl"),
    metadataObjectString(asset, "storage", "publicCdnUrl"),
    metadataObjectString(asset, "storage", "storagePath"),
  );
  if (publicUrl) return publicUrl;
  if (kind === "thumbnailImage") return asset.thumbnailUrl || asset.url || asset.largeUrl || "";
  if (kind === "bannerImage") return asset.largeUrl || asset.url || asset.thumbnailUrl || "";
  return asset.url || asset.largeUrl || asset.thumbnailUrl || "";
};

export const mapArtistArtworkUploadResultToArtistFields = (
  result: MediaUploadResult,
  state: AdminArtistFormState,
  kind: ArtistArtworkUploadKind,
): ArtistArtworkFieldPatch | null => {
  const url = getUploadUrl(result);
  if (!url.trim()) return null;
  const config = artworkConfig[kind];
  const nextAssetId = result.mediaAsset?.assetId ?? "";
  const previousIds = new Set(state.previousArtistImageAssetIdsInput.split(",").map((item) => item.trim()).filter(Boolean));
  const existingAssetId = getExistingAssetId(state, kind);
  if (existingAssetId && nextAssetId && existingAssetId !== nextAssetId) previousIds.add(existingAssetId);

  return {
    [config.fieldUrl ?? "profileImage"]: url,
    [config.assetField]: nextAssetId,
    [config.storageField]: result.storageObject?.storageObjectId ?? result.storageObjectId ?? "",
    previousArtistImageAssetIdsInput: [...previousIds].join(", "),
    pendingArtistArtworkAssignment: !state.artistId?.trim(),
  };
};

export const mapArtistArtworkAssetToArtistFields = (
  asset: MediaAssetRecord,
  state: AdminArtistFormState,
  kind: ArtistArtworkUploadKind,
): ArtistArtworkFieldPatch | null => {
  const url = getAssetUrlForArtwork(asset, kind);
  if (!url.trim()) return null;
  const config = artworkConfig[kind];
  const previousIds = new Set(state.previousArtistImageAssetIdsInput.split(",").map((item) => item.trim()).filter(Boolean));
  const existingAssetId = getExistingAssetId(state, kind);
  if (existingAssetId && existingAssetId !== asset.assetId) previousIds.add(existingAssetId);

  return {
    [config.fieldUrl ?? "profileImage"]: url,
    [config.assetField]: asset.assetId,
    [config.storageField]: getAssetStorageObjectId(asset),
    previousArtistImageAssetIdsInput: [...previousIds].join(", "),
    pendingArtistArtworkAssignment: !state.artistId?.trim(),
  };
};

export const getArtistArtworkAssetInfo = (state: AdminArtistFormState) => ({
  profileImageAssetId: state.profileImageAssetId.trim() || null,
  profileImageStorageObjectId: state.profileImageStorageObjectId.trim() || null,
  thumbnailAssetId: state.profileThumbnailAssetId.trim() || null,
  thumbnailStorageObjectId: state.profileThumbnailStorageObjectId.trim() || null,
  characterArtAssetId: state.characterArtAssetId.trim() || null,
  characterArtStorageObjectId: state.characterArtStorageObjectId.trim() || null,
  bannerAssetId: state.profileBannerAssetId.trim() || null,
  bannerStorageObjectId: state.profileBannerStorageObjectId.trim() || null,
  pendingAssignment: isArtistArtworkUploadPendingAssignment(state),
  hasPreviousAssets: Boolean(state.previousArtistImageAssetIdsInput.trim()),
});

export const validateArtistArtworkReadiness = (state: AdminArtistFormState): string[] => {
  const warnings: string[] = [];
  if (!state.profileImage.trim()) warnings.push("Profile image is missing.");
  if (!state.characterArtUrl.trim()) warnings.push("Character art is optional but not uploaded yet.");
  if (!state.profileBannerUrl.trim()) warnings.push("Banner image is optional but not uploaded yet.");
  if (state.pendingArtistArtworkAssignment) warnings.push("Uploaded artist artwork is pending artist assignment until this artist is saved.");
  return warnings;
};

export const isArtistArtworkUploadPendingAssignment = (state: AdminArtistFormState): boolean =>
  Boolean(state.pendingArtistArtworkAssignment || (!state.artistId?.trim() && (
    state.profileImageAssetId.trim() ||
    state.profileThumbnailAssetId.trim() ||
    state.characterArtAssetId.trim() ||
    state.profileBannerAssetId.trim()
  )));
