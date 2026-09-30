import type {
  ArtistAdminRecord,
  ArtistAdminStatus,
  MediaAssetRecord,
  MediaAssetStatus,
  PublicSiteConfig,
  SongReleaseAdminRecord,
} from "../../models/admin";
import type { ReleaseExternalLinks, ReleaseStatus } from "../../models/release";
import type { SeoMetadata } from "../../models/seo";
import type { SocialShareMetadata } from "../../models/social";
import { isSafePublicUrl } from "../socialShareMetadata";
import { validateStatusTransition as validateWorkflowTransition } from "./statusWorkflow";

export interface AdminValidationResult {
  valid: boolean;
  errors: string[];
}

const result = (errors: string[]): AdminValidationResult => ({ valid: errors.length === 0, errors });

const artistStatuses: ArtistAdminStatus[] = ["draft", "active", "archived"];
const releaseStatuses: ReleaseStatus[] = ["draft", "published", "archived"];
const mediaStatuses: MediaAssetStatus[] = ["draft", "published", "archived"];

export const validateSlug = (slug: string | null | undefined): AdminValidationResult => {
  const value = slug?.trim() ?? "";
  const errors: string[] = [];
  if (!value) errors.push("Slug is required.");
  if (value && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    errors.push("Slug must be lowercase, hyphen-separated, and URL-safe.");
  }
  return result(errors);
};

export const validateExternalLinks = (links: ReleaseExternalLinks | undefined): AdminValidationResult => {
  const errors: string[] = [];
  Object.entries(links ?? {}).forEach(([key, value]) => {
    if (value && !isSafePublicUrl(value)) errors.push(`${key} has an unsafe or invalid URL.`);
  });
  return result(errors);
};

export const validateSeoMetadata = (metadata: SeoMetadata | undefined): AdminValidationResult => {
  if (!metadata) return result([]);
  const errors: string[] = [];
  if (!metadata.title?.trim()) errors.push("SEO title is required when SEO metadata is provided.");
  if (!metadata.description?.trim()) errors.push("SEO description is required when SEO metadata is provided.");
  if (metadata.imageUrl && !isSafePublicUrl(metadata.imageUrl)) errors.push("SEO image URL is unsafe or invalid.");
  return result(errors);
};

export const validateSocialMetadata = (metadata: SocialShareMetadata | undefined): AdminValidationResult => {
  if (!metadata) return result([]);
  const errors: string[] = [];
  if (!metadata.title?.trim()) errors.push("Social title is required when social metadata is provided.");
  if (!metadata.description?.trim()) errors.push("Social description is required when social metadata is provided.");
  if (metadata.imageUrl && !isSafePublicUrl(metadata.imageUrl)) errors.push("Social image URL is unsafe or invalid.");
  return result(errors);
};

export const validateStatusTransition = (
  contentType: "artist" | "release",
  from: ArtistAdminStatus | ReleaseStatus,
  to: ArtistAdminStatus | ReleaseStatus,
): AdminValidationResult => result(validateWorkflowTransition(contentType, from, to));

export const validateArtistAdminRecord = (artist: ArtistAdminRecord): AdminValidationResult => {
  const errors: string[] = [];
  if (!artist.artistId) errors.push("artistId is required.");
  if (!artist.name) errors.push("name is required.");
  if (!artist.displayName) errors.push("displayName is required.");
  if (!artistStatuses.includes(artist.status)) errors.push("Artist status is invalid.");
  errors.push(...validateSlug(artist.slug).errors);
  errors.push(...validateExternalLinks(artist.externalLinks).errors);
  errors.push(...validateSeoMetadata(artist.seoMetadata).errors);
  errors.push(...validateSocialMetadata(artist.socialMetadata).errors);

  if (artist.status === "active" && (!artist.slug || !artist.displayName)) {
    errors.push("Active artists require a valid slug and displayName.");
  }

  return result(errors);
};

export const validateReleaseAdminRecord = (
  release: SongReleaseAdminRecord,
  activeArtistIds: readonly string[] = [],
): AdminValidationResult => {
  const errors: string[] = [];
  if (!release.releaseId) errors.push("releaseId is required.");
  if (!release.songId) errors.push("songId is required.");
  if (!release.title) errors.push("title is required.");
  if (!releaseStatuses.includes(release.status)) errors.push("Release status is invalid.");
  errors.push(...validateSlug(release.slug).errors);
  errors.push(...validateExternalLinks(release.externalLinks).errors);
  errors.push(...validateSeoMetadata(release.seoMetadata).errors);
  errors.push(...validateSocialMetadata(release.socialMetadata).errors);

  if (release.releaseDate && Number.isNaN(new Date(`${release.releaseDate}T00:00:00`).getTime())) {
    errors.push("releaseDate is invalid.");
  }

  if (release.status === "published") {
    if (!release.title || !release.slug || !release.artistId || !release.releaseDate) {
      errors.push("Published releases require title, slug, artistId, and releaseDate.");
    }
    if (activeArtistIds.length > 0 && !activeArtistIds.includes(release.artistId)) {
      errors.push("Published releases require an active artist.");
    }
  }

  return result(errors);
};

export const validateMediaAssetRecord = (asset: MediaAssetRecord): AdminValidationResult => {
  const errors: string[] = [];
  if (!asset.assetId) errors.push("assetId is required.");
  if (!mediaStatuses.includes(asset.status)) errors.push("Media status is invalid.");
  if (asset.url && !isSafePublicUrl(asset.url)) errors.push("Media asset URL is unsafe or invalid.");
  if (asset.thumbnailUrl && !isSafePublicUrl(asset.thumbnailUrl)) errors.push("Media thumbnail URL is unsafe or invalid.");
  if (asset.largeUrl && !isSafePublicUrl(asset.largeUrl)) errors.push("Media large URL is unsafe or invalid.");
  if (asset.status === "published") {
    if (!asset.title) errors.push("Published media assets require a title.");
    if (!asset.url) errors.push("Published media assets require a URL.");
    if (asset.ownerType !== "site" && !asset.ownerId) errors.push("Published media assets require an ownerId.");
  }
  return result(errors);
};

export const validateSiteConfig = (config: PublicSiteConfig): AdminValidationResult => {
  const errors: string[] = [];
  if (!config.siteName) errors.push("siteName is required.");
  if (!config.siteDescription) errors.push("siteDescription is required.");
  if (!Array.isArray(config.homepageSections)) errors.push("homepageSections must be an array.");
  if (!Array.isArray(config.navigationLinks)) errors.push("navigationLinks must be an array.");
  if (!Array.isArray(config.footerLinks)) errors.push("footerLinks must be an array.");
  return result(errors);
};
