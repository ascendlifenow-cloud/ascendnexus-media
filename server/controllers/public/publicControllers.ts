import type { IncomingMessage, ServerResponse } from "node:http";
import { publicContentDeliveryService } from "../../services/public/PublicContentDeliveryService";
import { publicExperienceHealthService } from "../../services/public/PublicExperienceHealthService";
import { publicLandingService } from "../../services/public/PublicLandingService";
import { publishedContentSynchronizationService } from "../../services/public/PublishedContentSynchronizationService";
import { buildPublicRuntimeConfig, getBackendConfig } from "../../config/backendConfig";
import { createPublicError } from "../../utils/public/publicErrorUtils";
import { paginatePublicItems, parsePagination, parsePublicSort, validateQueryString } from "../../utils/public/publicQueryValidationUtils";
import { publicSuccess, sendPublicResponse } from "../../utils/public/publicResponseUtils";

export class PublicControllers {
  async health(request: IncomingMessage, response: ServerResponse) {
    sendPublicResponse(request, response, publicSuccess(await publicContentDeliveryService.buildPublicDeliveryHealth()), { cacheControl: "public, max-age=30" });
  }

  async config(request: IncomingMessage, response: ServerResponse) {
    sendPublicResponse(request, response, publicSuccess(buildPublicRuntimeConfig(getBackendConfig())), { cacheControl: "public, max-age=60, stale-while-revalidate=300" });
  }

  async site(request: IncomingMessage, response: ServerResponse) {
    sendPublicResponse(request, response, publicSuccess(await publicContentDeliveryService.getPublicSiteConfiguration()), { cacheControl: "public, max-age=300, stale-while-revalidate=600" });
  }

  async homepage(request: IncomingMessage, response: ServerResponse) {
    sendPublicResponse(request, response, publicSuccess(await publicContentDeliveryService.getPublicHomepage()), { cacheControl: "public, max-age=120, stale-while-revalidate=300" });
  }

  async landing(request: IncomingMessage, response: ServerResponse) {
    sendPublicResponse(request, response, publicSuccess(await publicLandingService.getPublicLandingExperience()), { cacheControl: "public, max-age=120, stale-while-revalidate=300" });
  }

  async artists(request: IncomingMessage, response: ServerResponse, url: URL) {
    const { page, pageSize } = parsePagination(url);
    parsePublicSort(url, "artists", "sortOrder");
    const { items, pagination } = paginatePublicItems(await publicContentDeliveryService.listPublicArtists(), page, pageSize);
    sendPublicResponse(request, response, publicSuccess(items, { pagination }));
  }

  async artist(request: IncomingMessage, response: ServerResponse, slug: string) {
    const artist = await publicContentDeliveryService.getPublicArtistBySlug(slug);
    if (!artist) throw createPublicError("PUBLIC_RESOURCE_NOT_FOUND", "Public resource was not found.", 404);
    sendPublicResponse(request, response, publicSuccess(artist));
  }

  async artistReleases(request: IncomingMessage, response: ServerResponse, slug: string, url: URL) {
    const { page, pageSize } = parsePagination(url);
    const { items, pagination } = paginatePublicItems(await publicContentDeliveryService.getPublicArtistReleases(slug), page, pageSize);
    sendPublicResponse(request, response, publicSuccess(items, { pagination }));
  }

  async releases(request: IncomingMessage, response: ServerResponse, url: URL) {
    const { page, pageSize } = parsePagination(url);
    parsePublicSort(url, "releases", "releaseDate");
    const filters = { artistId: url.searchParams.get("artistId") ?? undefined, genre: url.searchParams.get("genre") ?? undefined, styleTag: url.searchParams.get("styleTag") ?? undefined };
    const { items, pagination } = paginatePublicItems(await publicContentDeliveryService.listPublicReleases(filters), page, pageSize);
    sendPublicResponse(request, response, publicSuccess(items, { pagination }));
  }

  async latestReleases(request: IncomingMessage, response: ServerResponse) {
    sendPublicResponse(request, response, publicSuccess(await publicContentDeliveryService.getLatestPublicReleases()));
  }

  async featuredReleases(request: IncomingMessage, response: ServerResponse) {
    sendPublicResponse(request, response, publicSuccess(await publicContentDeliveryService.getFeaturedPublicReleases()));
  }

  async release(request: IncomingMessage, response: ServerResponse, slug: string) {
    const release = await publicContentDeliveryService.getPublicReleaseBySlug(slug);
    if (!release) throw createPublicError("PUBLIC_RESOURCE_NOT_FOUND", "Public resource was not found.", 404);
    sendPublicResponse(request, response, publicSuccess(release));
  }

  async gallery(request: IncomingMessage, response: ServerResponse, url: URL) {
    const { page, pageSize } = parsePagination(url);
    parsePublicSort(url, "gallery", "sortOrder");
    const filters = { mediaType: url.searchParams.get("mediaType") ?? undefined, artistId: url.searchParams.get("artistId") ?? undefined, releaseId: url.searchParams.get("releaseId") ?? undefined };
    const { items, pagination } = paginatePublicItems(await publicContentDeliveryService.listPublicGalleryItems(filters), page, pageSize);
    sendPublicResponse(request, response, publicSuccess(items, { pagination }));
  }

  async galleryItem(request: IncomingMessage, response: ServerResponse, slug: string) {
    const item = await publicContentDeliveryService.getPublicGalleryItemBySlug(slug);
    if (!item) throw createPublicError("PUBLIC_RESOURCE_NOT_FOUND", "Public resource was not found.", 404);
    sendPublicResponse(request, response, publicSuccess(item));
  }

  async search(request: IncomingMessage, response: ServerResponse, url: URL) {
    validateQueryString(url);
    sendPublicResponse(request, response, publicSuccess(await publicContentDeliveryService.searchPublicContent(Object.fromEntries(url.searchParams.entries()))), { cacheControl: "public, max-age=30" });
  }

  async searchSuggestions(request: IncomingMessage, response: ServerResponse, url: URL) {
    validateQueryString(url);
    sendPublicResponse(request, response, publicSuccess(await publicContentDeliveryService.getPublicSearchSuggestions(Object.fromEntries(url.searchParams.entries()))), { cacheControl: "public, max-age=60" });
  }

  async browse(request: IncomingMessage, response: ServerResponse, url: URL) {
    validateQueryString(url);
    sendPublicResponse(request, response, publicSuccess(await publicContentDeliveryService.browsePublicContent(Object.fromEntries(url.searchParams.entries()))));
  }

  async relatedReleases(request: IncomingMessage, response: ServerResponse, slugOrId: string, url: URL) {
    validateQueryString(url);
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "6", 10);
    sendPublicResponse(request, response, publicSuccess(await publicContentDeliveryService.getRelatedPublicReleases(slugOrId, Number.isFinite(limit) ? limit : 6)), { cacheControl: "public, max-age=300" });
  }

  async metadata(request: IncomingMessage, response: ServerResponse, url: URL) {
    const path = url.searchParams.get("path") ?? "/";
    const metadata = await publicContentDeliveryService.getPublicMetadataForPath(path);
    if (!metadata) throw createPublicError("PUBLIC_METADATA_NOT_FOUND", "Public metadata was not found.", 404);
    sendPublicResponse(request, response, publicSuccess(metadata), { cacheControl: "public, max-age=300" });
  }

  async adminDeliveryHealth(request: IncomingMessage, response: ServerResponse) {
    sendPublicResponse(request, response, publicSuccess(await publishedContentSynchronizationService.getHealth()), { cacheControl: "no-store" });
  }

  async adminPublicExperienceHealth(request: IncomingMessage, response: ServerResponse) {
    sendPublicResponse(request, response, publicSuccess(await publicExperienceHealthService.buildHealth()), { cacheControl: "no-store" });
  }

  async cacheMetrics(request: IncomingMessage, response: ServerResponse) {
    sendPublicResponse(request, response, publicSuccess((await publicContentDeliveryService.buildPublicDeliveryHealth()).cacheMetrics), { cacheControl: "no-store" });
  }
}

export const publicControllers = new PublicControllers();
