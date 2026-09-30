import type { ArtistPublicProfile } from "../../models/artist";
import type { PublicGalleryItem } from "../../models/gallery";
import type { HomepageContent, HomepageSectionConfig } from "../../models/homepage";
import type { PublicSongRelease } from "../../models/release";
import type {
  AdminMetadataRecord,
  ArtistAdminRecord,
  PublicSiteConfig,
  PublishingEntityType,
  PublishingStatus,
  SongReleaseAdminRecord,
} from "../../models/admin";
import {
  getPublishingBlockingIssues,
  getPublishingStatus,
  getPublishingWarnings,
  type PublishingWorkflowContext,
} from "./publishingWorkflowUtils";

export type AdminPreviewEntityType = "artist" | "release" | "gallery" | "homepage" | "metadata";

export interface AdminPreviewReadiness {
  status: PublishingStatus;
  warnings: string[];
  blockingIssues: string[];
  publicLink?: string;
  publicSafe: boolean;
}

const sortNewestFirst = (a: PublicSongRelease, b: PublicSongRelease) => {
  const aTime = Date.parse(a.releaseDate);
  const bTime = Date.parse(b.releaseDate);
  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return a.title.localeCompare(b.title);
  if (Number.isNaN(aTime)) return 1;
  if (Number.isNaN(bTime)) return -1;
  return bTime - aTime;
};

export const mapAdminArtistToPreviewProfile = (artist: ArtistAdminRecord): ArtistPublicProfile => ({
  artistId: artist.artistId,
  name: artist.name,
  slug: artist.slug,
  displayName: artist.displayName,
  bio: artist.bio,
  profileImage: artist.profileImage,
  status: artist.status === "active" ? "active" : "archived",
  sortOrder: artist.sortOrder,
  musicStyle: artist.genres?.[0] ?? artist.styleTags?.[0] ?? "AI Persona Artist",
  featured: Boolean(artist.featured),
  externalLinks: artist.externalLinks,
});

export const mapAdminReleaseToPreviewRelease = (release: SongReleaseAdminRecord): PublicSongRelease => ({
  releaseId: release.releaseId,
  songId: release.songId,
  artistId: release.artistId,
  title: release.title,
  slug: release.slug,
  coverArtUrl: release.coverArtUrl,
  audioPreviewUrl: release.audioPreviewUrl,
  releaseDate: release.releaseDate,
  genre: release.genre,
  styleTags: Array.isArray(release.styleTags) ? release.styleTags : [],
  status: release.status,
  externalLinks: release.externalLinks,
  featured: release.featured,
  featuredSortOrder: release.featuredSortOrder,
  featuredLabel: release.featuredLabel,
  featuredDescription: release.featuredDescription ?? release.description,
  featuredPlacement: release.featuredPlacement,
});

export const mapAdminGalleryItemToPreviewItem = (item: PublicGalleryItem): PublicGalleryItem => ({
  ...item,
  metadata: item.metadata ?? {},
});

export const mapAdminHomepageConfigToPreviewConfig = (config: PublicSiteConfig): HomepageSectionConfig[] =>
  [...config.homepageSections]
    .map((section) => ({
      sectionId: section.sectionId,
      sectionType: section.sectionType,
      enabled: section.enabled,
      sortOrder: section.sortOrder,
      title: section.title,
      subtitle: section.subtitle,
      configuration: section.configuration,
      metadata: section.metadata,
    }))
    .sort((a, b) => (a.sortOrder ?? Number.POSITIVE_INFINITY) - (b.sortOrder ?? Number.POSITIVE_INFINITY));

export const buildPreviewPublicLink = (
  entityType: AdminPreviewEntityType,
  entity: ArtistAdminRecord | SongReleaseAdminRecord | PublicGalleryItem | PublicSiteConfig | AdminMetadataRecord,
): string | undefined => {
  if (entityType === "artist" && "status" in entity && entity.status === "active") return `/artists/${entity.slug}`;
  if (entityType === "release" && "status" in entity && entity.status === "published") return `/songs/${entity.slug}`;
  if (entityType === "gallery" && "galleryItemId" in entity && entity.status === "published") return "/gallery";
  if (entityType === "homepage") return "/";
  if (entityType === "metadata" && "publicPath" in entity && !entity.noIndex && entity.publicPath) return entity.publicPath;
  return undefined;
};

const toPublishingEntityType = (entityType: AdminPreviewEntityType): PublishingEntityType => {
  if (entityType === "gallery") return "gallery_item";
  if (entityType === "homepage") return "site_config";
  if (entityType === "metadata") return "seo_metadata";
  return entityType;
};

export const getPreviewWarnings = (
  entityType: AdminPreviewEntityType,
  entity: unknown,
  context: PublishingWorkflowContext = {},
): string[] => getPublishingWarnings(toPublishingEntityType(entityType), entity).concat(
  entityType === "release" && context.artist && context.artist.status !== "active"
    ? ["Associated artist is not active, so this release is not public-safe."]
    : [],
);

export const getPreviewBlockingIssues = (
  entityType: AdminPreviewEntityType,
  entity: unknown,
  context: PublishingWorkflowContext = {},
): string[] => getPublishingBlockingIssues(toPublishingEntityType(entityType), entity, context);

export const buildPreviewReadiness = (
  entityType: AdminPreviewEntityType,
  entity: ArtistAdminRecord | SongReleaseAdminRecord | PublicGalleryItem | PublicSiteConfig | AdminMetadataRecord,
  context: PublishingWorkflowContext = {},
): AdminPreviewReadiness => {
  const publishingType = toPublishingEntityType(entityType);
  const status = getPublishingStatus(publishingType, entity, context);
  const publicLink = buildPreviewPublicLink(entityType, entity);

  return {
    status,
    warnings: getPreviewWarnings(entityType, entity, context),
    blockingIssues: getPreviewBlockingIssues(entityType, entity, context),
    publicLink,
    publicSafe: status.publicVisibility === "public" && Boolean(publicLink),
  };
};

export const buildHomepagePreviewContent = (
  artists: readonly ArtistAdminRecord[],
  releases: readonly SongReleaseAdminRecord[],
): HomepageContent => {
  const previewArtists = artists.map(mapAdminArtistToPreviewProfile).sort((a, b) => a.sortOrder - b.sortOrder);
  const previewReleases = releases.map(mapAdminReleaseToPreviewRelease).sort(sortNewestFirst);
  const featuredRelease = previewReleases[0];
  const featuredArtist = featuredRelease
    ? previewArtists.find((artist) => artist.artistId === featuredRelease.artistId)
    : undefined;

  return {
    artists: previewArtists,
    featuredRelease: featuredRelease && featuredArtist ? { release: featuredRelease, artist: featuredArtist } : undefined,
    featuredArtists: previewArtists.slice(0, 6),
    spotlightArtists: previewArtists.slice(0, 6).map((artist) => {
      const artistReleases = previewReleases.filter((release) => release.artistId === artist.artistId);
      const styleTags = Array.from(new Set(artistReleases.flatMap((release) => release.styleTags).filter(Boolean))).sort();
      return {
        artist,
        latestRelease: artistReleases[0],
        primaryGenre: artistReleases[0]?.genre,
        styleTags,
      };
    }),
    releaseGroups: previewArtists
      .map((artist) => ({
        artist,
        releases: previewReleases.filter((release) => release.artistId === artist.artistId).slice(0, 3),
      }))
      .filter((group) => group.releases.length > 0),
  };
};
