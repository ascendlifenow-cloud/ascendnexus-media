import type { ArtistRecord } from "../models/artists/ArtistModel";
import type { GalleryItemRecord } from "../models/gallery/GalleryItemModel";
import type { MediaAsset } from "../models/mediaModels";
import type { SongReleaseRecord } from "../models/releases/SongReleaseModel";
import type { SiteConfigurationRecord } from "../models/site/SiteConfigurationModel";
import { currentSchemaVersion } from "./databaseSerialization";

const now = () => new Date().toISOString();

export const normalizeLegacyArtistRecord = (record: Partial<ArtistRecord> & { artistId: string; slug: string; name?: string; displayName?: string }): ArtistRecord => ({
  artistId: record.artistId,
  name: record.name ?? record.displayName ?? record.slug,
  displayName: record.displayName ?? record.name ?? record.slug,
  slug: record.slug,
  bio: record.bio ?? "",
  status: record.status ?? "draft",
  genres: record.genres ?? [],
  styleTags: record.styleTags ?? [],
  profileImage: record.profileImage,
  sortOrder: record.sortOrder ?? 999,
  featured: Boolean(record.featured),
  externalLinks: record.externalLinks ?? {},
  publicationState: record.publicationState ?? "draft",
  publicVisibility: Boolean(record.publicVisibility),
  createdAt: record.createdAt ?? now(),
  updatedAt: record.updatedAt ?? now(),
  metadata: { ...record.metadata, legacyNormalized: true },
  schemaVersion: record.schemaVersion ?? currentSchemaVersion,
});

export const normalizeLegacyReleaseRecord = (record: Partial<SongReleaseRecord> & { releaseId: string; songId: string; artistId: string; slug: string; title?: string }): SongReleaseRecord => ({
  releaseId: record.releaseId,
  songId: record.songId,
  artistId: record.artistId,
  title: record.title ?? record.slug,
  slug: record.slug,
  releaseDate: record.releaseDate ?? now(),
  genre: record.genre ?? "Uncategorized",
  styleTags: record.styleTags ?? [],
  status: record.status ?? "draft",
  publicationState: record.publicationState ?? "draft",
  publicVisibility: Boolean(record.publicVisibility),
  featured: Boolean(record.featured),
  coverArtUrl: record.coverArtUrl,
  audioPreviewUrl: record.audioPreviewUrl,
  externalLinks: record.externalLinks ?? {},
  createdAt: record.createdAt ?? now(),
  updatedAt: record.updatedAt ?? now(),
  metadata: { ...record.metadata, legacyNormalized: true, fullSongPublicFieldQuarantined: true },
  schemaVersion: record.schemaVersion ?? currentSchemaVersion,
});

export const normalizeLegacyMediaAssetRecord = (record: Partial<MediaAsset> & { assetId: string; title?: string; ownerType?: string; assetType?: string }): MediaAsset => ({
  assetId: record.assetId,
  ownerType: record.ownerType ?? "media_library",
  ownerId: record.ownerId,
  assetType: record.assetType ?? "custom",
  title: record.title ?? record.assetId,
  description: record.description,
  url: record.assetType === "full_song" ? undefined : record.url,
  thumbnailUrl: record.thumbnailUrl,
  largeUrl: record.largeUrl,
  altText: record.altText,
  credit: record.credit,
  status: record.status ?? "draft",
  sortOrder: record.sortOrder,
  activeVersionId: record.activeVersionId,
  assignmentStatus: record.assignmentStatus ?? "unassigned",
  createdBy: record.createdBy,
  updatedBy: record.updatedBy,
  createdAt: record.createdAt ?? now(),
  updatedAt: record.updatedAt ?? now(),
  metadata: { ...record.metadata, legacyNormalized: true },
});

export const normalizeLegacyGalleryRecord = (record: Partial<GalleryItemRecord> & { galleryItemId: string; slug: string; title?: string }): GalleryItemRecord => ({
  galleryItemId: record.galleryItemId,
  title: record.title ?? record.slug,
  slug: record.slug,
  description: record.description,
  imageUrl: record.imageUrl,
  thumbnailUrl: record.thumbnailUrl,
  mediaType: record.mediaType ?? "image",
  sourceType: record.sourceType ?? "manual",
  sourceId: record.sourceId,
  artistId: record.artistId,
  releaseId: record.releaseId,
  sortOrder: record.sortOrder ?? 999,
  status: record.status ?? "draft",
  publicationState: record.publicationState ?? "draft",
  publicVisibility: Boolean(record.publicVisibility),
  createdAt: record.createdAt ?? now(),
  updatedAt: record.updatedAt ?? now(),
  metadata: { ...record.metadata, legacyNormalized: true },
  schemaVersion: record.schemaVersion ?? currentSchemaVersion,
});

export const normalizeLegacySiteConfigRecord = (record: Partial<SiteConfigurationRecord> & { siteConfigId?: string }): SiteConfigurationRecord => ({
  siteConfigId: record.siteConfigId ?? "site-config-default",
  version: record.version ?? 1,
  status: record.status ?? "draft",
  publicationState: record.publicationState ?? "draft",
  siteName: record.siteName ?? "Ascend Nexus Media",
  siteDescription: record.siteDescription ?? "",
  brandLogoUrl: record.brandLogoUrl,
  defaultCoverArtUrl: record.defaultCoverArtUrl,
  defaultArtistImageUrl: record.defaultArtistImageUrl,
  defaultSocialImageUrl: record.defaultSocialImageUrl,
  navigation: record.navigation ?? [],
  footer: record.footer ?? {},
  socialLinks: record.socialLinks ?? {},
  contactSettings: record.contactSettings ?? {},
  theme: record.theme ?? {},
  analyticsPublicConfig: record.analyticsPublicConfig,
  createdAt: record.createdAt ?? now(),
  updatedAt: record.updatedAt ?? now(),
  metadata: { ...record.metadata, legacyNormalized: true },
  schemaVersion: record.schemaVersion ?? currentSchemaVersion,
});
