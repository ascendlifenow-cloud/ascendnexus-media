import { publicContentDeliveryService } from "../public/PublicContentDeliveryService";
import { publicContentCacheService } from "../public/PublicContentCacheService";
import { nowIso } from "./operationsShared";

export class HomepageAutomationService {
  async buildAutomationPlan() {
    const [latest, featured, homepage] = await Promise.all([
      publicContentDeliveryService.getLatestPublicReleases(),
      publicContentDeliveryService.getFeaturedPublicReleases(),
      publicContentDeliveryService.getPublicHomepage(),
    ]);
    return {
      status: "ready",
      automationTargets: [
        { target: "latest_releases", status: "ready", itemCount: Array.isArray(latest) ? latest.length : 0 },
        { target: "featured_releases", status: "ready", itemCount: Array.isArray(featured) ? featured.length : 0 },
        { target: "homepage_sections", status: homepage ? "ready" : "warning", itemCount: Array.isArray((homepage as { sections?: unknown[] })?.sections) ? (homepage as { sections?: unknown[] }).sections?.length ?? 0 : 0 },
        { target: "artist_spotlight", status: "ready", itemCount: 0 },
        { target: "new_galleries", status: "ready", itemCount: 0 },
      ],
      warnings: homepage ? [] : ["No published homepage configuration is available; automation will use public delivery fallbacks."],
      checkedAt: nowIso(),
    };
  }

  async runSafeRefresh() {
    publicContentCacheService.clearPublicCache();
    return { status: "completed", refreshedTargets: ["homepage", "latest_releases", "featured_releases", "artist_pages"], checkedAt: nowIso() };
  }
}

export const homepageAutomationService = new HomepageAutomationService();
