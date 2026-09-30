import type {
  ArtistAdminRecord,
  CreateMediaAssetDto,
  MediaAssetOwnerType,
  MediaAssetRecord,
  MediaAssetStatus,
  MediaAssetType,
  SongReleaseAdminRecord,
  UpdateMediaAssetDto,
} from "../../models/admin";

export type MediaAssetPublicVisibilityState = "public" | "not_public" | "needs_required_fields" | "owner_not_public";

export interface AdminMediaFormState {
  assetId?: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string;
  largeUrl: string;
  assetType: MediaAssetType;
  ownerType: MediaAssetOwnerType;
  ownerId: string;
  altText: string;
  credit: string;
  status: MediaAssetStatus;
  sortOrder: string;
}

export interface AdminMediaFormValidation {
  valid: boolean;
  errors: Record<string, string>;
  missingFields: string[];
}

export const mediaAssetTypeLabels: Record<MediaAssetType, string> = {
  full_song: "Full Song",
  cover_art: "Cover Art",
  artist_profile: "Artist Profile",
  artist_character_art: "Artist Character Art",
  artist_banner: "Artist Banner",
  audio_preview: "Audio Preview",
  stem: "Stem",
  instrumental: "Instrumental",
  vocal: "Vocal",
  custom_audio: "Custom Audio",
  promo_graphic: "Promo Graphic",
  gallery_image: "Gallery Image",
  video_thumbnail: "Video Thumbnail",
  social_preview: "Social Preview",
  logo: "Logo",
  fallback_image: "Fallback Image",
  video: "Video",
  lyric_video: "Lyric Video",
  short_clip: "Short Clip",
  animation: "Animation",
  custom_image: "Custom Image",
  custom: "Custom",
};

export const mediaOwnerTypeLabels: Record<MediaAssetOwnerType, string> = {
  artist: "Artist",
  release: "Release",
  gallery: "Gallery",
  site: "Site",
  media_library: "Media Library",
  custom: "Custom",
};

const imageAssetTypes: MediaAssetType[] = [
  "cover_art",
  "artist_profile",
  "artist_character_art",
  "artist_banner",
  "promo_graphic",
  "gallery_image",
  "video_thumbnail",
  "social_preview",
  "logo",
  "fallback_image",
  "custom_image",
];

export const isImageMediaAssetType = (assetType: MediaAssetType): boolean => imageAssetTypes.includes(assetType);

const isPrivateStorageReference = (value: string): boolean =>
  /^(private|processing|quarantine)\//.test(value.trim());

export const validateMediaAssetUrl = (value: string, options: { allowPrivateStorageReference?: boolean } = {}): boolean => {
  const url = value.trim();
  if (!url) return true;
  if (/^javascript:/i.test(url)) return false;
  if (options.allowPrivateStorageReference && isPrivateStorageReference(url)) return true;
  return (
    url.startsWith("/") ||
    url.startsWith("./") ||
    url.startsWith("../") ||
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:image/")
  );
};

export const createEmptyMediaFormState = (): AdminMediaFormState => ({
  title: "",
  description: "",
  url: "",
  thumbnailUrl: "",
  largeUrl: "",
  assetType: "cover_art",
  ownerType: "site",
  ownerId: "",
  altText: "",
  credit: "",
  status: "draft",
  sortOrder: "",
});

export const mapMediaAssetToFormState = (asset: MediaAssetRecord): AdminMediaFormState => ({
  assetId: asset.assetId,
  title: asset.title,
  description: asset.description ?? "",
  url: asset.url,
  thumbnailUrl: asset.thumbnailUrl ?? "",
  largeUrl: asset.largeUrl ?? "",
  assetType: asset.assetType,
  ownerType: asset.ownerType,
  ownerId: asset.ownerId,
  altText: asset.altText ?? "",
  credit: asset.credit ?? "",
  status: asset.status,
  sortOrder: asset.sortOrder !== undefined ? String(asset.sortOrder) : "",
});

export const getMediaAssetFormMissingFields = (state: AdminMediaFormState): string[] => {
  const fields: string[] = [];
  if (!state.title.trim()) fields.push("Title");
  if (!state.url.trim()) fields.push("Asset URL");
  if (!state.assetType.trim()) fields.push("Asset Type");
  if (!state.ownerType.trim()) fields.push("Owner Type");
  if (state.ownerType !== "site" && !state.ownerId.trim()) fields.push("Owner ID");
  if (isImageMediaAssetType(state.assetType) && !state.altText.trim()) fields.push("Alt Text");
  return fields;
};

export const validateMediaOwnerAssignment = (state: AdminMediaFormState): string | null => {
  if (!state.ownerType) return "Owner type is required.";
  if (state.ownerType !== "site" && !state.ownerId.trim()) return "Owner ID is required for this owner type.";
  return null;
};

export const validateMediaAssetPublishReadiness = (
  state: AdminMediaFormState,
  artist?: ArtistAdminRecord | null,
  release?: SongReleaseAdminRecord | null,
): string[] => {
  const missing = getMediaAssetFormMissingFields(state);
  if (state.ownerType === "artist" && (!artist || artist.status !== "active")) missing.push("Public artist owner");
  if (state.ownerType === "release" && (!release || release.status !== "published")) missing.push("Published release owner");
  return missing;
};

export const getMediaAssetPublicVisibilityState = (
  state: AdminMediaFormState,
  artist?: ArtistAdminRecord | null,
  release?: SongReleaseAdminRecord | null,
): MediaAssetPublicVisibilityState => {
  if (state.status !== "published") return "not_public";
  if (!state.title.trim() || !state.url.trim() || !state.assetType || !state.ownerType) return "needs_required_fields";
  if (isImageMediaAssetType(state.assetType) && !state.altText.trim()) return "needs_required_fields";
  if (state.ownerType !== "site" && !state.ownerId.trim()) return "needs_required_fields";
  if (state.ownerType === "artist" && (!artist || artist.status !== "active")) return "owner_not_public";
  if (state.ownerType === "release" && (!release || release.status !== "published")) return "owner_not_public";
  return "public";
};

export const validateMediaAssetForm = (
  state: AdminMediaFormState,
  artist?: ArtistAdminRecord | null,
  release?: SongReleaseAdminRecord | null,
): AdminMediaFormValidation => {
  const errors: Record<string, string> = {};
  const allowPrivateStorageReference = state.assetType === "full_song" || state.assetType === "custom_audio" || state.assetType === "audio_preview";
  if (state.status === "published" && !state.title.trim()) errors.title = "Title is required before publishing.";
  if (state.status === "published" && !state.url.trim()) errors.url = "Asset URL is required before publishing.";
  if (state.url.trim() && !validateMediaAssetUrl(state.url, { allowPrivateStorageReference })) errors.url = "Asset URL is not safe.";
  if (state.thumbnailUrl.trim() && !validateMediaAssetUrl(state.thumbnailUrl)) errors.thumbnailUrl = "Thumbnail URL is not safe.";
  if (state.largeUrl.trim() && !validateMediaAssetUrl(state.largeUrl)) errors.largeUrl = "Large URL is not safe.";
  if (!state.assetType) errors.assetType = "Asset type is required.";
  const ownerError = validateMediaOwnerAssignment(state);
  if (state.status === "published" && ownerError) errors.ownerId = ownerError;
  if (state.ownerType === "artist" && state.status === "published" && artist && artist.status !== "active") errors.ownerId = "Published media needs an active artist owner.";
  if (state.ownerType === "release" && state.status === "published" && release && release.status !== "published") errors.ownerId = "Published media needs a published release owner.";
  if (state.sortOrder && !Number.isFinite(Number(state.sortOrder))) errors.sortOrder = "Sort order must be numeric.";
  if (state.status === "published" && isImageMediaAssetType(state.assetType) && !state.altText.trim()) {
    errors.altText = "Alt text is required before publishing image assets.";
  }
  if (!["draft", "published", "archived"].includes(state.status)) errors.status = "Status is invalid.";

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    missingFields: getMediaAssetFormMissingFields(state),
  };
};

export const validateCreateMediaAssetDto = (payload: CreateMediaAssetDto): AdminMediaFormValidation =>
  validateMediaAssetForm(mapMediaAssetToFormState({ ...payload, assetId: payload.assetId ?? "new", createdAt: "", updatedAt: "" }));

export const validateUpdateMediaAssetDto = (payload: UpdateMediaAssetDto): AdminMediaFormValidation =>
  validateMediaAssetForm({
    ...createEmptyMediaFormState(),
    ...payload,
    assetId: "existing",
    sortOrder: payload.sortOrder !== undefined ? String(payload.sortOrder) : "",
  });

export const toCreateMediaAssetDto = (state: AdminMediaFormState): CreateMediaAssetDto => ({
  assetId: state.assetId,
  title: state.title.trim(),
  description: state.description.trim() || undefined,
  url: state.url.trim(),
  thumbnailUrl: state.thumbnailUrl.trim() || undefined,
  largeUrl: state.largeUrl.trim() || undefined,
  assetType: state.assetType,
  ownerType: state.ownerType,
  ownerId: state.ownerType === "site" ? state.ownerId.trim() || "site" : state.ownerId.trim(),
  altText: state.altText.trim() || undefined,
  credit: state.credit.trim() || undefined,
  status: state.status,
  sortOrder: state.sortOrder ? Number(state.sortOrder) : undefined,
});

export const toUpdateMediaAssetDto = (state: AdminMediaFormState): UpdateMediaAssetDto => toCreateMediaAssetDto(state);
