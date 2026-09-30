import type { ArtistPublicProfile } from "../../models/artist";
import type { PublicGalleryItem } from "../../models/gallery";
import type { PublicSongRelease } from "../../models/release";
import type {
  ArtistAdminRecord,
  MediaAssetMetadataValue,
  MediaAssetRecord,
  PublicSiteConfig,
  PublicSiteNavigationLink,
  SongReleaseAdminRecord,
} from "../../models/admin";
import { getPublicSafeMediaUrl, isSafePublicMediaUrl } from "../media/publicSafeUrlUtils";

const toGalleryMetadataValue = (value: MediaAssetMetadataValue): string | number | boolean | null => {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value as string | number | boolean | null;
  return JSON.stringify(value);
};

const toGalleryMetadata = (metadata: MediaAssetRecord["metadata"]): PublicGalleryItem["metadata"] | undefined =>
  metadata
    ? Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, toGalleryMetadataValue(value)]))
    : undefined;

export const mapArtistAdminToPublicProfile = (
  artist: ArtistAdminRecord,
): ArtistPublicProfile | null => {
  if (artist.status !== "active") return null;

  return {
    artistId: artist.artistId,
    name: artist.name,
    slug: artist.slug,
    displayName: artist.displayName,
    bio: artist.bio,
    profileImage: isSafePublicMediaUrl(artist.profileImage) ? artist.profileImage : "",
    status: "active",
    sortOrder: artist.sortOrder,
    musicStyle: artist.genres?.join(", ") || artist.styleTags?.join(", ") || "AI Persona Artist",
    featured: Boolean(artist.featured),
    externalLinks: artist.externalLinks,
  };
};

export const mapReleaseAdminToPublicRelease = (
  release: SongReleaseAdminRecord,
  activeArtistIds: readonly string[] = [],
): PublicSongRelease | null => {
  if (release.status !== "published") return null;
  if (activeArtistIds.length > 0 && !activeArtistIds.includes(release.artistId)) return null;

  return {
    releaseId: release.releaseId,
    songId: release.songId,
    artistId: release.artistId,
    title: release.title,
    slug: release.slug,
    coverArtUrl: isSafePublicMediaUrl(release.coverArtUrl) ? release.coverArtUrl : undefined,
    audioPreviewUrl: isSafePublicMediaUrl(release.audioPreviewUrl) ? release.audioPreviewUrl : undefined,
    releaseDate: release.releaseDate,
    genre: release.genre,
    styleTags: release.styleTags,
    status: "published",
    externalLinks: release.externalLinks,
    featured: release.featured,
    featuredSortOrder: release.featuredSortOrder,
    featuredLabel: release.featuredLabel,
    featuredDescription: release.featuredDescription,
    featuredPlacement: release.featuredPlacement,
  };
};

export const mapMediaAssetToGalleryItem = (asset: MediaAssetRecord): PublicGalleryItem | null => {
  const publicUrl = getPublicSafeMediaUrl(asset, { publicAllowed: true });
  if (!publicUrl) return null;
  const sourceType =
    asset.ownerType === "release"
      ? "release"
      : asset.ownerType === "artist"
        ? "artist"
        : asset.assetType === "promo_graphic"
          ? "promo"
          : asset.assetType === "video_thumbnail"
            ? "video"
            : "custom";

  return {
    galleryItemId: `gallery-asset-${asset.assetId}`,
    sourceType,
    sourceId: asset.ownerId,
    title: asset.title,
    slug: asset.assetId,
    description: asset.description,
    imageUrl: publicUrl,
    thumbnailUrl: isSafePublicMediaUrl(asset.thumbnailUrl) ? asset.thumbnailUrl : publicUrl,
    altText: asset.altText,
    artistId: asset.ownerType === "artist" ? asset.ownerId : undefined,
    releaseId: asset.ownerType === "release" ? asset.ownerId : undefined,
    mediaType:
      asset.assetType === "cover_art" ||
      asset.assetType === "artist_profile" ||
      asset.assetType === "promo_graphic" ||
      asset.assetType === "video_thumbnail"
        ? asset.assetType
        : "custom",
    status: "published",
    sortOrder: asset.sortOrder,
    createdAt: asset.createdAt,
    metadata: toGalleryMetadata(asset.metadata),
  };
};

export const mapSiteConfigToPublicNavigation = (config: PublicSiteConfig): PublicSiteNavigationLink[] =>
  [...config.navigationLinks]
    .filter((link) => link.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

export const mapSiteConfigToFooterConfig = (config: PublicSiteConfig): PublicSiteNavigationLink[] =>
  [...config.footerLinks]
    .filter((link) => link.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

export const mapPublicArtistToAdminRecord = (artist: ArtistPublicProfile): ArtistAdminRecord => ({
  artistId: artist.artistId,
  name: artist.name,
  slug: artist.slug,
  displayName: artist.displayName,
  bio: artist.bio,
  profileImage: artist.profileImage,
  status: artist.status,
  sortOrder: artist.sortOrder,
  externalLinks: artist.externalLinks,
  featured: artist.featured,
  genres: artist.musicStyle ? [artist.musicStyle] : undefined,
});

export const mapPublicReleaseToAdminRecord = (release: PublicSongRelease): SongReleaseAdminRecord => ({
  releaseId: release.releaseId,
  songId: release.songId,
  artistId: release.artistId,
  title: release.title,
  slug: release.slug,
  coverArtUrl: release.coverArtUrl,
  audioPreviewUrl: release.audioPreviewUrl,
  releaseDate: release.releaseDate,
  genre: release.genre,
  styleTags: release.styleTags,
  status: release.status,
  externalLinks: release.externalLinks,
  featured: release.featured,
  featuredSortOrder: release.featuredSortOrder,
  featuredLabel: release.featuredLabel,
  featuredDescription: release.featuredDescription,
  featuredPlacement: release.featuredPlacement,
});
