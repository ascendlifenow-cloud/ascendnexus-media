import type { IncomingMessage, ServerResponse } from "node:http";
import { publicControllers } from "../controllers/public/publicControllers";
import { publicConsentAnalyticsControllers } from "../controllers/public/publicConsentAnalyticsControllers";
import { publicFormControllers } from "../controllers/public/publicFormControllers";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";

export const handlePublicRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (method === "OPTIONS" && path.startsWith("/api/public")) {
    sendJson(response, 204, {}, {
      "Access-Control-Allow-Origin": request.headers.origin ?? "*",
      "Access-Control-Allow-Credentials": "false",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, If-None-Match, If-Modified-Since, Idempotency-Key",
      "Cache-Control": "public, max-age=300",
    });
    return true;
  }
  if (method === "GET" && path === "/api/public/health") return publicControllers.health(request, response).then(() => true);
  if (method === "GET" && path === "/api/public/config") return publicControllers.config(request, response).then(() => true);
  if (method === "GET" && path === "/api/public/site") return publicControllers.site(request, response).then(() => true);
  if (method === "GET" && path === "/api/public/homepage") return publicControllers.homepage(request, response).then(() => true);
  if (method === "GET" && path === "/api/public/landing") return publicControllers.landing(request, response).then(() => true);
  if (method === "GET" && path === "/api/public/consent/policy") return publicConsentAnalyticsControllers.consentPolicy(request, response).then(() => true);
  if (method === "GET" && path === "/api/public/consent/availability") return publicConsentAnalyticsControllers.consentAvailability(request, response).then(() => true);
  if (method === "POST" && path === "/api/public/consent") return publicConsentAnalyticsControllers.recordConsent(request, response).then(() => true);
  if (method === "POST" && path === "/api/public/consent/withdraw") return publicConsentAnalyticsControllers.withdrawConsent(request, response).then(() => true);
  if (method === "POST" && path === "/api/public/analytics/events") return publicConsentAnalyticsControllers.recordAnalyticsEvents(request, response).then(() => true);
  if (method === "GET" && path === "/api/public/contact/availability") return publicFormControllers.contactAvailability(request, response).then(() => true);
  if (method === "POST" && path === "/api/public/contact") return publicFormControllers.submitContact(request, response).then(() => true);
  if (method === "GET" && path === "/api/public/newsletter/availability") return publicFormControllers.newsletterAvailability(request, response).then(() => true);
  if (method === "POST" && path === "/api/public/newsletter/subscribe") return publicFormControllers.subscribeNewsletter(request, response).then(() => true);
  if (method === "POST" && path === "/api/public/newsletter/confirm") return publicFormControllers.confirmNewsletter(request, response).then(() => true);
  if (method === "POST" && path === "/api/public/newsletter/unsubscribe") return publicFormControllers.unsubscribeNewsletter(request, response).then(() => true);
  if (method === "GET" && path === "/api/public/artists") return publicControllers.artists(request, response, url).then(() => true);
  const artistReleasesMatch = /^\/api\/public\/artists\/([^/]+)\/releases$/.exec(path);
  if (method === "GET" && artistReleasesMatch) return publicControllers.artistReleases(request, response, artistReleasesMatch[1], url).then(() => true);
  const artistMatch = /^\/api\/public\/artists\/([^/]+)$/.exec(path);
  if (method === "GET" && artistMatch) return publicControllers.artist(request, response, artistMatch[1]).then(() => true);
  if (method === "GET" && path === "/api/public/releases") return publicControllers.releases(request, response, url).then(() => true);
  if (method === "GET" && path === "/api/public/releases/latest") return publicControllers.latestReleases(request, response).then(() => true);
  if (method === "GET" && path === "/api/public/releases/featured") return publicControllers.featuredReleases(request, response).then(() => true);
  const releaseMatch = /^\/api\/public\/releases\/([^/]+)$/.exec(path);
  if (method === "GET" && releaseMatch) return publicControllers.release(request, response, releaseMatch[1]).then(() => true);
  if (method === "GET" && path === "/api/public/gallery") return publicControllers.gallery(request, response, url).then(() => true);
  const galleryItemMatch = /^\/api\/public\/gallery\/([^/]+)$/.exec(path);
  if (method === "GET" && galleryItemMatch) return publicControllers.galleryItem(request, response, galleryItemMatch[1]).then(() => true);
  if (method === "GET" && path === "/api/public/search/suggestions") return publicControllers.searchSuggestions(request, response, url).then(() => true);
  if (method === "GET" && path === "/api/public/search") return publicControllers.search(request, response, url).then(() => true);
  if (method === "GET" && path === "/api/public/browse") return publicControllers.browse(request, response, url).then(() => true);
  const relatedReleaseMatch = /^\/api\/public\/discovery\/related\/releases\/([^/]+)$/.exec(path);
  if (method === "GET" && relatedReleaseMatch) return publicControllers.relatedReleases(request, response, relatedReleaseMatch[1], url).then(() => true);
  if (method === "GET" && (path === "/api/public/metadata" || path === "/api/public/metadata/path")) return publicControllers.metadata(request, response, url).then(() => true);
  if (method === "GET" && (path === "/api/admin/public-delivery/health" || path === "/api/admin/system/public-delivery/health")) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "publication.read");
    return publicControllers.adminDeliveryHealth(request, response).then(() => true);
  }
  if (method === "GET" && (path === "/api/admin/public-experience/health" || path === "/api/admin/system/public-experience/health")) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "publication.read");
    return publicControllers.adminPublicExperienceHealth(request, response).then(() => true);
  }
  if (method === "GET" && path === "/api/admin/public-delivery/cache/metrics") {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "publication.read");
    return publicControllers.cacheMetrics(request, response).then(() => true);
  }
  if (method === "GET" && (path === "/api/admin/analytics/health" || path === "/api/admin/system/analytics")) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "analytics.read");
    return publicConsentAnalyticsControllers.analyticsHealth(request, response).then(() => true);
  }
  return false;
};
