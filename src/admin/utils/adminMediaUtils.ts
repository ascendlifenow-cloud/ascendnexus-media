import type {
  MediaAssetOwnerType,
  MediaAssetRecord,
  MediaAssetStatus,
  MediaAssetType,
} from "../../models/admin";
import { getMediaAdminStats } from "./adminStats";
import { getFormattedAdminDate } from "./adminArtistUtils";

export type AdminMediaAssetTypeFilter = "all" | MediaAssetType;
export type AdminMediaOwnerTypeFilter = "all" | MediaAssetOwnerType;
export type AdminMediaStatusFilter = "all" | MediaAssetStatus;
export type AdminMediaSortMode =
  | "createdNewest"
  | "createdOldest"
  | "updatedNewest"
  | "title"
  | "assetType"
  | "ownerType"
  | "sortOrder";

export interface AdminMediaFiltersState {
  assetTypeFilter: AdminMediaAssetTypeFilter;
  ownerTypeFilter: AdminMediaOwnerTypeFilter;
  statusFilter: AdminMediaStatusFilter;
}

export interface AdminMediaMissingDataFlags {
  missingUrl: boolean;
  missingThumbnail: boolean;
  missingAltText: boolean;
  missingTitle: boolean;
  missingOwner: boolean;
  missingCredit: boolean;
  brokenImageReady: boolean;
}

const assetTypeLabels: Record<MediaAssetType, string> = {
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

const ownerTypeLabels: Record<MediaAssetOwnerType, string> = {
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

const getDateValue = (value?: string): number => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

const normalized = (value?: string | null): string => value?.trim().toLowerCase() ?? "";
const comparable = (value?: string | null): string => value?.trim() ?? "";

export const formatMediaAssetType = (assetType: MediaAssetType): string => assetTypeLabels[assetType] ?? "Custom";

export const formatMediaOwnerType = (ownerType: MediaAssetOwnerType): string => ownerTypeLabels[ownerType] ?? "Custom";

export const getMediaAssetPreviewType = (asset: MediaAssetRecord): "image" | "audio" | "generic" => {
  if (["audio_preview", "full_song", "stem", "instrumental", "vocal", "custom_audio"].includes(asset.assetType)) return "audio";
  if (imageAssetTypes.includes(asset.assetType)) return "image";
  return "generic";
};

export const searchAdminMediaAssets = (assets: readonly MediaAssetRecord[], query: string): MediaAssetRecord[] => {
  const value = query.trim().toLowerCase();
  if (!value) return [...assets];

  return assets.filter((asset) =>
    [
      asset.title,
      asset.description,
      asset.assetId,
      asset.ownerId,
      asset.ownerType,
      asset.assetType,
      asset.altText,
      asset.credit,
    ]
      .filter(Boolean)
      .some((field) => normalized(field).includes(value)),
  );
};

export const filterAdminMediaAssets = (
  assets: readonly MediaAssetRecord[],
  filters: AdminMediaFiltersState,
): MediaAssetRecord[] =>
  assets.filter((asset) => {
    const typeMatches = filters.assetTypeFilter === "all" || asset.assetType === filters.assetTypeFilter;
    const ownerMatches = filters.ownerTypeFilter === "all" || asset.ownerType === filters.ownerTypeFilter;
    const statusMatches = filters.statusFilter === "all" || asset.status === filters.statusFilter;
    return typeMatches && ownerMatches && statusMatches;
  });

export const sortAdminMediaAssets = (
  assets: readonly MediaAssetRecord[],
  sortMode: AdminMediaSortMode,
): MediaAssetRecord[] =>
  [...assets].sort((a, b) => {
    if (sortMode === "createdOldest") return getDateValue(a.createdAt) - getDateValue(b.createdAt);
    if (sortMode === "updatedNewest") return getDateValue(b.updatedAt) - getDateValue(a.updatedAt);
    if (sortMode === "title") return comparable(a.title).localeCompare(comparable(b.title));
    if (sortMode === "assetType") return comparable(a.assetType).localeCompare(comparable(b.assetType)) || comparable(a.title).localeCompare(comparable(b.title));
    if (sortMode === "ownerType") return comparable(a.ownerType).localeCompare(comparable(b.ownerType)) || comparable(a.title).localeCompare(comparable(b.title));
    if (sortMode === "sortOrder") {
      const orderA = a.sortOrder ?? Number.POSITIVE_INFINITY;
      const orderB = b.sortOrder ?? Number.POSITIVE_INFINITY;
      return orderA - orderB || comparable(a.title).localeCompare(comparable(b.title));
    }
    return getDateValue(b.createdAt) - getDateValue(a.createdAt) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

export const getAdminMediaStats = (assets: readonly MediaAssetRecord[]) => {
  const baseStats = getMediaAdminStats(assets);

  return {
    ...baseStats,
    coverArt: assets.filter((asset) => asset.assetType === "cover_art").length,
    artistImages: assets.filter((asset) => asset.assetType === "artist_profile" || asset.assetType === "artist_banner").length,
    audioPreviews: assets.filter((asset) => asset.assetType === "audio_preview").length,
    missingAltText: assets.filter((asset) => getMediaAssetMissingDataFlags(asset).missingAltText).length,
  };
};

export const getMediaAssetMissingDataFlags = (asset: MediaAssetRecord): AdminMediaMissingDataFlags => ({
  missingUrl: !asset.url?.trim(),
  missingThumbnail: getMediaAssetPreviewType(asset) === "image" && !asset.thumbnailUrl?.trim(),
  missingAltText: getMediaAssetPreviewType(asset) === "image" && !asset.altText?.trim(),
  missingTitle: !asset.title?.trim(),
  missingOwner: !asset.ownerId?.trim() || !asset.ownerType,
  missingCredit: !asset.credit?.trim(),
  brokenImageReady: getMediaAssetPreviewType(asset) === "image",
});

export const getMediaAssetMissingDataLabels = (asset: MediaAssetRecord): string[] => {
  const flags = getMediaAssetMissingDataFlags(asset);
  const labels: string[] = [];
  if (flags.missingUrl) labels.push("URL");
  if (flags.missingThumbnail) labels.push("Thumbnail");
  if (flags.missingAltText) labels.push("Alt Text");
  if (flags.missingTitle) labels.push("Title");
  if (flags.missingOwner) labels.push("Owner");
  if (flags.missingCredit) labels.push("Credit");
  return labels;
};

export const getMediaAssetPublicVisibilityState = (asset: MediaAssetRecord): "public" | "not_public" =>
  asset.status === "published" && Boolean(asset.url?.trim()) ? "public" : "not_public";

export const getAvailableAdminMediaAssetTypes = (assets: readonly MediaAssetRecord[]): MediaAssetType[] =>
  [...new Set(assets.map((asset) => asset.assetType).filter(Boolean))].sort((a, b) => formatMediaAssetType(a).localeCompare(formatMediaAssetType(b)));

export const getAvailableAdminMediaOwnerTypes = (assets: readonly MediaAssetRecord[]): MediaAssetOwnerType[] =>
  [...new Set(assets.map((asset) => asset.ownerType).filter(Boolean))].sort((a, b) => formatMediaOwnerType(a).localeCompare(formatMediaOwnerType(b)));

export const getFormattedMediaDate = getFormattedAdminDate;
