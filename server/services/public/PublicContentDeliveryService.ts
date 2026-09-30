import { mapSiteConfigToPublicSiteConfiguration } from "../../mappers/public/mapSiteConfigToPublicSiteConfiguration";
import { publicArtistService } from "./PublicArtistService";
import { publicBrowseService } from "./PublicBrowseService";
import { publicContentCacheService } from "./PublicContentCacheService";
import { publicGalleryDeliveryService } from "./PublicGalleryDeliveryService";
import { publicHomepageDeliveryService } from "./PublicHomepageDeliveryService";
import { publicMetadataDeliveryService } from "./PublicMetadataDeliveryService";
import { publicReleaseService } from "./PublicReleaseService";
import { publicSearchDeliveryService } from "./PublicSearchService";
import { publishedContentSynchronizationService } from "./PublishedContentSynchronizationService";
import { publicResponseSafetyService } from "./PublicResponseSafetyService";
import { validatePublicSlug } from "../../utils/public/publicQueryValidationUtils";
import { createPublicError } from "../../utils/public/publicErrorUtils";

export class PublicContentDeliveryService {
  getPublicSiteConfiguration() {
    return publicContentCacheService.getOrSet("public:site", async () => mapSiteConfigToPublicSiteConfiguration(), { ttlSeconds: 900, entityType: "site_config" });
  }

  getPublicHomepage() {
    return publicContentCacheService.getOrSet("public:homepage", () => publicHomepageDeliveryService.getPublicHomepage(), { ttlSeconds: 300, entityType: "homepage" });
  }

  listPublicArtists() {
    return publicContentCacheService.getOrSet("public:artists:list", () => publicArtistService.listActivePublishedArtists(), { ttlSeconds: 600, entityType: "artist" });
  }

  getPublicArtistBySlug(slug: string) {
    validatePublicSlug(slug, "artist slug");
    if (publicContentCacheService.isHidden("artist", slug)) return undefined;
    return publicContentCacheService.getOrSet(`public:artist:${slug}`, () => publicArtistService.getPublishedArtistBySlug(slug), { ttlSeconds: 600, entityType: "artist", entityId: slug });
  }

  getPublicArtistReleases(slugOrId: string) {
    validatePublicSlug(slugOrId, "artist slug");
    if (publicContentCacheService.isHidden("artist", slugOrId)) return [];
    return publicContentCacheService.getOrSet(`public:artist:${slugOrId}:releases`, async () => {
      const artist = (await publicArtistService.listActivePublishedArtists()).find((item) => item.slug === slugOrId || item.artistId === slugOrId);
      return artist ? publicReleaseService.listPublishedReleases({ artistId: artist.artistId }) : [];
    }, { ttlSeconds: 300, entityType: "release" });
  }

  listPublicReleases(filters = {}) {
    return publicContentCacheService.getOrSet(publicContentCacheService.buildCacheKey("releases:list", "default", filters), () => publicReleaseService.listPublishedReleases(filters), { ttlSeconds: 300, entityType: "release" });
  }

  getLatestPublicReleases() {
    return publicContentCacheService.getOrSet("public:releases:latest", () => publicReleaseService.getLatestThreeReleasesPerArtist(), { ttlSeconds: 300, entityType: "release" });
  }

  getFeaturedPublicReleases() {
    return publicContentCacheService.getOrSet("public:releases:featured", () => publicReleaseService.getFeaturedReleases(), { ttlSeconds: 300, entityType: "release" });
  }

  getPublicReleaseBySlug(slug: string) {
    validatePublicSlug(slug, "release slug");
    if (publicContentCacheService.isHidden("release", slug)) return undefined;
    return publicContentCacheService.getOrSet(`public:release:${slug}`, () => publicReleaseService.getPublishedReleaseBySlug(slug), { ttlSeconds: 600, entityType: "release", entityId: slug });
  }

  listPublicGalleryItems(filters = {}) {
    return publicContentCacheService.getOrSet(publicContentCacheService.buildCacheKey("gallery:list", "default", filters), () => publicGalleryDeliveryService.listPublishedGalleryItems(filters), { ttlSeconds: 600, entityType: "gallery_item" });
  }

  getPublicGalleryItemBySlug(slug: string) {
    validatePublicSlug(slug, "gallery item slug");
    if (publicContentCacheService.isHidden("gallery_item", slug)) return undefined;
    return publicContentCacheService.getOrSet(`public:gallery:${slug}`, () => publicGalleryDeliveryService.getPublishedGalleryItemBySlug(slug), { ttlSeconds: 600, entityType: "gallery_item", entityId: slug });
  }

  searchPublicContent(params: Record<string, string | undefined> | string) {
    return publicContentCacheService.getOrSet(publicContentCacheService.buildCacheKey("search", params), () => publicSearchDeliveryService.searchPublicContent(params), { ttlSeconds: 30, entityType: "search" });
  }

  getPublicSearchSuggestions(params: Record<string, string | undefined>) {
    return publicContentCacheService.getOrSet(publicContentCacheService.buildCacheKey("search:suggestions", params), () => publicSearchDeliveryService.suggestPublicContent(params), { ttlSeconds: 60, entityType: "search" });
  }

  getRelatedPublicReleases(releaseSlugOrId: string, limit?: number) {
    validatePublicSlug(releaseSlugOrId, "release slug");
    return publicContentCacheService.getOrSet(publicContentCacheService.buildCacheKey("search:related:releases", releaseSlugOrId, { limit }), () => publicSearchDeliveryService.getRelatedReleases(releaseSlugOrId, limit), { ttlSeconds: 300, entityType: "release", entityId: releaseSlugOrId });
  }

  browsePublicContent(filters = {}) {
    return publicContentCacheService.getOrSet(publicContentCacheService.buildCacheKey("browse", "default", filters), () => publicBrowseService.browsePublicContent(filters), { ttlSeconds: 60, entityType: "browse" });
  }

  getPublicMetadataForPath(path: string) {
    if (path.includes("..") || path.startsWith("/admin") || path.startsWith("/api")) throw createPublicError("PUBLIC_INVALID_FILTER", "Invalid public metadata path.", 400);
    return publicContentCacheService.getOrSet(`public:metadata:${path}`, () => publicMetadataDeliveryService.getMetadataForPath(path), { ttlSeconds: 900, entityType: "metadata", path });
  }

  async verifyPublicResponseSafety(endpoint: string, payload: unknown) {
    return publicResponseSafetyService.buildSafetyReport(payload, { endpoint });
  }

  invalidatePublicContentCache(keys: string[] = []) {
    if (!keys.length) publicContentCacheService.clearPublicCache();
    keys.forEach((key) => publicContentCacheService.deleteByPattern(key));
  }

  async buildPublicDeliveryHealth() {
    const [artists, releases, sync] = await Promise.all([
      publicArtistService.listActivePublishedArtists(),
      publicReleaseService.listPublishedReleases(),
      publishedContentSynchronizationService.getHealth(),
    ]);
    return {
      status: "ok",
      databaseAvailable: true,
      cacheAvailable: publicContentCacheService.getCacheHealth().cacheAvailable,
      cache: publicContentCacheService.getCacheHealth(),
      cacheMetrics: publicContentCacheService.getMetrics(),
      publicContentAvailable: artists.length > 0 || releases.length > 0,
      publishedArtistCount: artists.length,
      publishedReleaseCount: releases.length,
      lastPublicationSync: sync.lastSuccessfulPublicationSync,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const publicContentDeliveryService = new PublicContentDeliveryService();
