import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../models/admin";
import type { GalleryMediaType, GallerySourceType, GalleryStatus, PublicGalleryItem } from "../../models/gallery";
import { getFormattedAdminDate } from "./adminArtistUtils";

export type AdminGalleryMediaTypeFilter = "all" | GalleryMediaType;
export type AdminGallerySourceTypeFilter = "all" | GallerySourceType;
export type AdminGalleryStatusFilter = "all" | GalleryStatus;
export type AdminGallerySortMode =
  | "sortOrder"
  | "createdNewest"
  | "createdOldest"
  | "title"
  | "mediaType"
  | "sourceType"
  | "status";

export interface AdminGalleryFiltersState {
  mediaTypeFilter: AdminGalleryMediaTypeFilter;
  sourceTypeFilter: AdminGallerySourceTypeFilter;
  statusFilter: AdminGalleryStatusFilter;
}

export interface AdminGalleryMissingDataFlags {
  missingImageUrl: boolean;
  missingThumbnail: boolean;
  missingTitle: boolean;
  missingSlug: boolean;
  missingAltText: boolean;
  missingSourceReference: boolean;
  missingRelatedArtistOrRelease: boolean;
  invalidStatus: boolean;
}

export type GalleryPublicVisibilityState = "public" | "not_public";

const mediaTypeLabels: Record<GalleryMediaType, string> = {
  image: "Image",
  cover_art: "Cover Art",
  artist_profile: "Artist Profile",
  promo_graphic: "Promo Graphic",
  video_thumbnail: "Video Thumbnail",
  custom: "Custom",
};

const sourceTypeLabels: Record<GallerySourceType, string> = {
  artist: "Artist",
  release: "Release",
  promo: "Promo",
  video: "Video",
  custom: "Custom",
};

const validStatuses: GalleryStatus[] = ["published", "draft", "archived"];

const getDateValue = (value?: string): number => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

const normalized = (value?: string): string => value?.trim().toLowerCase() ?? "";

export const formatGalleryMediaType = (mediaType: GalleryMediaType): string => mediaTypeLabels[mediaType] ?? "Custom";

export const formatGallerySourceType = (sourceType: GallerySourceType): string => sourceTypeLabels[sourceType] ?? "Custom";

export const searchAdminGalleryItems = (items: readonly PublicGalleryItem[], query: string): PublicGalleryItem[] => {
  const value = query.trim().toLowerCase();
  if (!value) return [...items];

  return items.filter((item) =>
    [
      item.title,
      item.slug,
      item.description,
      item.galleryItemId,
      item.artistId,
      item.releaseId,
      item.sourceId,
      item.sourceType,
      item.mediaType,
      item.altText,
    ]
      .filter(Boolean)
      .some((field) => normalized(field).includes(value)),
  );
};

export const filterAdminGalleryItems = (
  items: readonly PublicGalleryItem[],
  filters: AdminGalleryFiltersState,
): PublicGalleryItem[] =>
  items.filter((item) => {
    const mediaMatches = filters.mediaTypeFilter === "all" || item.mediaType === filters.mediaTypeFilter;
    const sourceMatches = filters.sourceTypeFilter === "all" || item.sourceType === filters.sourceTypeFilter;
    const statusMatches = filters.statusFilter === "all" || item.status === filters.statusFilter;
    return mediaMatches && sourceMatches && statusMatches;
  });

export const sortAdminGalleryItems = (
  items: readonly PublicGalleryItem[],
  sortMode: AdminGallerySortMode,
): PublicGalleryItem[] =>
  [...items].sort((a, b) => {
    if (sortMode === "createdNewest") return getDateValue(b.createdAt) - getDateValue(a.createdAt);
    if (sortMode === "createdOldest") return getDateValue(a.createdAt) - getDateValue(b.createdAt);
    if (sortMode === "title") return a.title.localeCompare(b.title);
    if (sortMode === "mediaType") return a.mediaType.localeCompare(b.mediaType) || a.title.localeCompare(b.title);
    if (sortMode === "sourceType") return a.sourceType.localeCompare(b.sourceType) || a.title.localeCompare(b.title);
    if (sortMode === "status") return a.status.localeCompare(b.status) || a.title.localeCompare(b.title);
    const orderA = a.sortOrder ?? Number.POSITIVE_INFINITY;
    const orderB = b.sortOrder ?? Number.POSITIVE_INFINITY;
    return orderA - orderB || getDateValue(b.createdAt) - getDateValue(a.createdAt) || a.title.localeCompare(b.title);
  });

export const getAvailableAdminGalleryMediaTypes = (items: readonly PublicGalleryItem[]): GalleryMediaType[] =>
  [...new Set(items.map((item) => item.mediaType))].sort((a, b) => formatGalleryMediaType(a).localeCompare(formatGalleryMediaType(b)));

export const getAvailableAdminGallerySourceTypes = (items: readonly PublicGalleryItem[]): GallerySourceType[] =>
  [...new Set(items.map((item) => item.sourceType))].sort((a, b) => formatGallerySourceType(a).localeCompare(formatGallerySourceType(b)));

export const getAdminGalleryStats = (items: readonly PublicGalleryItem[]) => ({
  total: items.length,
  published: items.filter((item) => item.status === "published").length,
  draft: items.filter((item) => item.status === "draft").length,
  archived: items.filter((item) => item.status === "archived").length,
  coverArt: items.filter((item) => item.mediaType === "cover_art").length,
  artistProfiles: items.filter((item) => item.mediaType === "artist_profile").length,
  promoGraphics: items.filter((item) => item.mediaType === "promo_graphic").length,
  videoThumbnails: items.filter((item) => item.mediaType === "video_thumbnail").length,
  missingAltText: items.filter((item) => getGalleryItemMissingDataFlags(item).missingAltText).length,
});

export const joinGalleryItemWithSource = (
  item: PublicGalleryItem,
  artists: readonly ArtistAdminRecord[],
  releases: readonly SongReleaseAdminRecord[],
) => ({
  item,
  artist: item.artistId ? artists.find((artist) => artist.artistId === item.artistId) ?? null : null,
  release: item.releaseId ? releases.find((release) => release.releaseId === item.releaseId) ?? null : null,
});

export const getGalleryItemMissingDataFlags = (
  item: PublicGalleryItem,
  artists: readonly ArtistAdminRecord[] = [],
  releases: readonly SongReleaseAdminRecord[] = [],
): AdminGalleryMissingDataFlags => {
  const joined = joinGalleryItemWithSource(item, artists, releases);

  return {
    missingImageUrl: !item.imageUrl?.trim(),
    missingThumbnail: !item.thumbnailUrl?.trim(),
    missingTitle: !item.title?.trim(),
    missingSlug: !item.slug?.trim(),
    missingAltText: !item.altText?.trim(),
    missingSourceReference: !item.sourceId?.trim(),
    missingRelatedArtistOrRelease:
      (item.sourceType === "artist" && !joined.artist) || (item.sourceType === "release" && !joined.release),
    invalidStatus: !validStatuses.includes(item.status),
  };
};

export const getGalleryItemMissingDataLabels = (
  item: PublicGalleryItem,
  artists: readonly ArtistAdminRecord[] = [],
  releases: readonly SongReleaseAdminRecord[] = [],
): string[] => {
  const flags = getGalleryItemMissingDataFlags(item, artists, releases);
  const labels: string[] = [];
  if (flags.missingImageUrl) labels.push("Image");
  if (flags.missingThumbnail) labels.push("Thumbnail");
  if (flags.missingTitle) labels.push("Title");
  if (flags.missingSlug) labels.push("Slug");
  if (flags.missingAltText) labels.push("Alt Text");
  if (flags.missingSourceReference) labels.push("Source");
  if (flags.missingRelatedArtistOrRelease) labels.push("Relationship");
  if (flags.invalidStatus) labels.push("Status");
  return labels;
};

export const getGalleryItemPublicVisibilityState = (
  item: PublicGalleryItem,
  artists: readonly ArtistAdminRecord[] = [],
  releases: readonly SongReleaseAdminRecord[] = [],
): GalleryPublicVisibilityState => {
  if (item.status !== "published" || !item.slug.trim() || !(item.imageUrl?.trim() || item.thumbnailUrl?.trim())) return "not_public";
  const { artist, release } = joinGalleryItemWithSource(item, artists, releases);
  if (item.sourceType === "artist" && (!artist || artist.status !== "active")) return "not_public";
  if (item.sourceType === "release" && (!release || release.status !== "published")) return "not_public";
  if (release && artist && artist.status !== "active") return "not_public";
  return "public";
};

export const getFormattedGalleryDate = getFormattedAdminDate;
