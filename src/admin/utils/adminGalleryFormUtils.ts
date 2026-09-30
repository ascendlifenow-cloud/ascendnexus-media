import type {
  ArtistAdminRecord,
  CreateGalleryItemDto,
  MediaAssetRecord,
  SongReleaseAdminRecord,
  UpdateGalleryItemDto,
} from "../../models/admin";
import type { GalleryMediaType, GallerySourceType, GalleryStatus, PublicGalleryItem } from "../../models/gallery";

export type GalleryItemPublicVisibilityState = "public" | "not_public" | "needs_required_fields" | "source_not_public" | "missing_image";

export interface AdminGalleryFormState {
  galleryItemId?: string;
  title: string;
  slug: string;
  sourceType: GallerySourceType;
  sourceId: string;
  imageUrl: string;
  thumbnailUrl: string;
  mediaAssetId: string;
  storageObjectId: string;
  originalFileName: string;
  previousGalleryAssetIdsInput: string;
  pendingGalleryAssignment: boolean;
  mediaType: GalleryMediaType;
  description: string;
  artistId: string;
  releaseId: string;
  altText: string;
  sortOrder: string;
  metadata: string;
  status: GalleryStatus;
}

export interface AdminGalleryFormValidation {
  valid: boolean;
  errors: Record<string, string>;
  missingFields: string[];
}

export const gallerySourceTypeLabels: Record<GallerySourceType, string> = {
  artist: "Artist",
  release: "Release",
  promo: "Promo",
  video: "Video",
  custom: "Custom",
};

export const galleryMediaTypeLabels: Record<GalleryMediaType, string> = {
  image: "Image",
  cover_art: "Cover Art",
  artist_profile: "Artist Profile",
  promo_graphic: "Promo Graphic",
  video_thumbnail: "Video Thumbnail",
  custom: "Custom",
};

export const slugifyGalleryValue = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const validateGalleryItemSlug = (slug: string): boolean => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim());

export const validateGalleryItemUrl = (value: string): boolean => {
  const url = value.trim();
  if (!url) return true;
  if (/^javascript:/i.test(url)) return false;
  if (url.includes("..")) return false;
  if (/^[a-z0-9][a-z0-9/_\-.,?=&%]+$/i.test(url)) return true;
  return (
    url.startsWith("/") ||
    url.startsWith("./") ||
    url.startsWith("../") ||
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:image/")
  );
};

const compactMetadata = (value: string): PublicGalleryItem["metadata"] | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = JSON.parse(trimmed) as PublicGalleryItem["metadata"];
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : { note: trimmed };
  } catch {
    return { note: trimmed };
  }
};

export const createEmptyGalleryFormState = (): AdminGalleryFormState => ({
  title: "",
  slug: "",
  sourceType: "custom",
  sourceId: "",
  imageUrl: "",
  thumbnailUrl: "",
  mediaAssetId: "",
  storageObjectId: "",
  originalFileName: "",
  previousGalleryAssetIdsInput: "",
  pendingGalleryAssignment: false,
  mediaType: "image",
  description: "",
  artistId: "",
  releaseId: "",
  altText: "",
  sortOrder: "",
  metadata: "",
  status: "draft",
});

export const mapGalleryItemToFormState = (item: PublicGalleryItem): AdminGalleryFormState => ({
  galleryItemId: item.galleryItemId,
  title: item.title,
  slug: item.slug,
  sourceType: item.sourceType,
  sourceId: item.sourceId,
  imageUrl: item.imageUrl ?? "",
  thumbnailUrl: item.thumbnailUrl ?? "",
  mediaAssetId: typeof item.metadata?.mediaAssetId === "string" ? item.metadata.mediaAssetId : "",
  storageObjectId: typeof item.metadata?.storageObjectId === "string" ? item.metadata.storageObjectId : "",
  originalFileName: typeof item.metadata?.originalFileName === "string" ? item.metadata.originalFileName : "",
  previousGalleryAssetIdsInput: typeof item.metadata?.previousGalleryAssetIds === "string" ? item.metadata.previousGalleryAssetIds : "",
  pendingGalleryAssignment: Boolean(item.metadata?.pendingGalleryAssignment),
  mediaType: item.mediaType,
  description: item.description ?? "",
  artistId: item.artistId ?? "",
  releaseId: item.releaseId ?? "",
  altText: item.altText ?? "",
  sortOrder: item.sortOrder !== undefined ? String(item.sortOrder) : "",
  metadata: item.metadata ? JSON.stringify(item.metadata, null, 2) : "",
  status: item.status,
});

export const getSelectedMediaAssetImageUrl = (state: AdminGalleryFormState, mediaAsset?: MediaAssetRecord | null): string =>
  state.imageUrl.trim() || mediaAsset?.thumbnailUrl || mediaAsset?.url || "";

export const validateGalleryItemSource = (
  state: AdminGalleryFormState,
  artist?: ArtistAdminRecord | null,
  release?: SongReleaseAdminRecord | null,
): string | null => {
  if (!state.sourceType) return "Source type is required.";
  if ((state.sourceType === "artist" || state.sourceType === "release") && !state.sourceId.trim()) {
    return "Source ID is required for artist and release gallery items.";
  }
  if (state.status === "published" && state.sourceType === "artist" && artist && artist.status !== "active") {
    return "Published gallery items require an active artist source.";
  }
  if (state.status === "published" && state.sourceType === "release" && release && release.status !== "published") {
    return "Published gallery items require a published release source.";
  }
  return null;
};

export const validateGalleryItemMedia = (state: AdminGalleryFormState, mediaAsset?: MediaAssetRecord | null): string | null => {
  if (!state.mediaType) return "Media type is required.";
  const imageSource = getSelectedMediaAssetImageUrl(state, mediaAsset);
  if (state.status === "published" && !imageSource.trim()) return "A valid image source is required before publishing.";
  if (state.imageUrl.trim() && !validateGalleryItemUrl(state.imageUrl)) return "Image URL is not safe.";
  if (state.thumbnailUrl.trim() && !validateGalleryItemUrl(state.thumbnailUrl)) return "Thumbnail URL is not safe.";
  if (imageSource.trim() && !validateGalleryItemUrl(imageSource)) return "Selected media source URL is not safe.";
  return null;
};

export const getGalleryItemFormMissingFields = (state: AdminGalleryFormState, mediaAsset?: MediaAssetRecord | null): string[] => {
  const fields: string[] = [];
  if (!state.title.trim()) fields.push("Title");
  if (!state.slug.trim()) fields.push("Slug");
  if (!state.mediaType.trim()) fields.push("Media Type");
  if (!getSelectedMediaAssetImageUrl(state, mediaAsset).trim()) fields.push("Image Source");
  if (!state.altText.trim()) fields.push("Alt Text");
  return fields;
};

export const validateGalleryItemPublishReadiness = (
  state: AdminGalleryFormState,
  mediaAsset?: MediaAssetRecord | null,
  artist?: ArtistAdminRecord | null,
  release?: SongReleaseAdminRecord | null,
): string[] => {
  const missing = getGalleryItemFormMissingFields(state, mediaAsset);
  if (state.sourceType === "artist" && (!artist || artist.status !== "active")) missing.push("Public artist source");
  if (state.sourceType === "release" && (!release || release.status !== "published")) missing.push("Published release source");
  return missing;
};

export const getGalleryItemPublicVisibilityState = (
  state: AdminGalleryFormState,
  mediaAsset?: MediaAssetRecord | null,
  artist?: ArtistAdminRecord | null,
  release?: SongReleaseAdminRecord | null,
): GalleryItemPublicVisibilityState => {
  if (state.status !== "published") return "not_public";
  if (!getSelectedMediaAssetImageUrl(state, mediaAsset).trim()) return "missing_image";
  if (!state.title.trim() || !state.slug.trim() || !state.mediaType || !state.altText.trim()) return "needs_required_fields";
  if (state.sourceType === "artist" && (!artist || artist.status !== "active")) return "source_not_public";
  if (state.sourceType === "release" && (!release || release.status !== "published")) return "source_not_public";
  return "public";
};

export const validateGalleryItemForm = (
  state: AdminGalleryFormState,
  mediaAsset?: MediaAssetRecord | null,
  artist?: ArtistAdminRecord | null,
  release?: SongReleaseAdminRecord | null,
): AdminGalleryFormValidation => {
  const errors: Record<string, string> = {};
  if (state.status === "published" && !state.title.trim()) errors.title = "Title is required before publishing.";
  if (state.status === "published" && !state.slug.trim()) errors.slug = "Slug is required before publishing.";
  if (state.slug.trim() && !validateGalleryItemSlug(state.slug)) errors.slug = "Slug must be lowercase, URL-safe, and hyphen-separated.";
  const sourceError = validateGalleryItemSource(state, artist, release);
  if (sourceError) errors.sourceId = sourceError;
  const mediaError = validateGalleryItemMedia(state, mediaAsset);
  if (mediaError) errors.imageUrl = mediaError;
  if (state.status === "published" && !state.altText.trim()) errors.altText = "Alt text is required before publishing.";
  if (state.sortOrder && !Number.isFinite(Number(state.sortOrder))) errors.sortOrder = "Sort order must be numeric.";
  if (!["draft", "published", "archived"].includes(state.status)) errors.status = "Status is invalid.";

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    missingFields: getGalleryItemFormMissingFields(state, mediaAsset),
  };
};

export const validateCreateGalleryItemDto = (payload: CreateGalleryItemDto): AdminGalleryFormValidation =>
  validateGalleryItemForm(mapGalleryItemToFormState({ ...payload, galleryItemId: payload.galleryItemId ?? "new", createdAt: "", updatedAt: "" }));

export const validateUpdateGalleryItemDto = (payload: UpdateGalleryItemDto): AdminGalleryFormValidation =>
  validateGalleryItemForm({
    ...createEmptyGalleryFormState(),
    ...payload,
    galleryItemId: "existing",
    sortOrder: payload.sortOrder !== undefined ? String(payload.sortOrder) : "",
    metadata: payload.metadata ? JSON.stringify(payload.metadata, null, 2) : "",
  });

export const toCreateGalleryItemDto = (state: AdminGalleryFormState, mediaAsset?: MediaAssetRecord | null): CreateGalleryItemDto => {
  const imageUrl = state.imageUrl.trim() || mediaAsset?.thumbnailUrl || mediaAsset?.url || "";
  const mediaMetadata = compactMetadata(state.metadata);
  const uploadMetadata: PublicGalleryItem["metadata"] = {
    ...(state.mediaAssetId ? { mediaAssetId: state.mediaAssetId } : {}),
    ...(state.storageObjectId.trim() ? { storageObjectId: state.storageObjectId.trim() } : {}),
    ...(state.originalFileName.trim() ? { originalFileName: state.originalFileName.trim() } : {}),
    ...(state.previousGalleryAssetIdsInput.trim() ? { previousGalleryAssetIds: state.previousGalleryAssetIdsInput.trim() } : {}),
    ...(state.pendingGalleryAssignment ? { pendingGalleryAssignment: true } : {}),
  };
  const metadata = {
    ...(mediaMetadata ?? {}),
    ...uploadMetadata,
  };
  return {
    galleryItemId: state.galleryItemId,
    title: state.title.trim(),
    slug: state.slug.trim(),
    sourceType: state.sourceType,
    sourceId: state.sourceId.trim(),
    imageUrl,
    thumbnailUrl: state.thumbnailUrl.trim() || mediaAsset?.thumbnailUrl || undefined,
    mediaType: state.mediaType,
    description: state.description.trim() || undefined,
    artistId: state.artistId.trim() || undefined,
    releaseId: state.releaseId.trim() || undefined,
    altText: state.altText.trim() || undefined,
    sortOrder: state.sortOrder ? Number(state.sortOrder) : undefined,
    status: state.status,
    metadata: Object.keys(metadata).length ? metadata : undefined,
  };
};

export const toUpdateGalleryItemDto = (state: AdminGalleryFormState, mediaAsset?: MediaAssetRecord | null): UpdateGalleryItemDto =>
  toCreateGalleryItemDto(state, mediaAsset);
