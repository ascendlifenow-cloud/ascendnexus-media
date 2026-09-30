import { artistRepository } from "../../repositories/ArtistRepository";
import { releaseRepository } from "../../repositories/ReleaseRepository";
import { galleryRepository } from "../../repositories/GalleryRepository";
import { analyticsEventRepository } from "../../repositories/AnalyticsEventRepository";
import { nowIso } from "./operationsShared";

export class GrowthAnalyticsService {
  async buildGrowthSummary() {
    const [artists, releases, gallery, analytics] = await Promise.all([
      artistRepository.list({ includeArchived: true }),
      releaseRepository.list({ includeArchived: true }),
      galleryRepository.list({ includeArchived: true }),
      analyticsEventRepository.list({ includeArchived: true }),
    ]);
    return {
      artists: {
        total: artists.length,
        active: artists.filter((artist) => artist.status === "active" || artist.publicationState === "published").length,
        inactive: artists.filter((artist) => artist.status !== "active" && artist.publicationState !== "published").length,
      },
      releases: {
        total: releases.length,
        published: releases.filter((release) => release.status === "published" && release.publicationState === "published").length,
        draft: releases.filter((release) => release.status === "draft").length,
      },
      gallery: {
        total: gallery.length,
        published: gallery.filter((item) => item.status === "published" && item.publicationState === "published").length,
      },
      engagement: {
        eventsTracked: analytics.length,
        privacyMode: "consent_controlled",
      },
      checkedAt: nowIso(),
    };
  }
}

export const growthAnalyticsService = new GrowthAnalyticsService();
