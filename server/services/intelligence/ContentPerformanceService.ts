import { galleryRepository } from "../../repositories/GalleryRepository";
import { releaseRepository } from "../../repositories/ReleaseRepository";
import { analyticsEventRepository } from "../../repositories/AnalyticsEventRepository";
import { distributionAnalyticsRepository } from "../../repositories/operations/OperationsRepository";
import { nowIso, scoreRelease } from "./intelligenceShared";

export class ContentPerformanceService {
  async buildContentPerformance() {
    const [releases, gallery, events, analytics] = await Promise.all([
      releaseRepository.list({ includeArchived: true }),
      galleryRepository.list({ includeArchived: true }),
      analyticsEventRepository.list({ includeArchived: true }),
      distributionAnalyticsRepository.list({ includeArchived: true }),
    ]);
    return {
      topSongs: releases.map((release) => ({ releaseId: release.releaseId, title: release.title, score: scoreRelease(release.releaseId, events, analytics) })).sort((a, b) => b.score - a.score).slice(0, 20),
      topAlbums: releases.filter((release) => release.metadata?.releaseType === "album").map((release) => ({ releaseId: release.releaseId, title: release.title, score: scoreRelease(release.releaseId, events, analytics) })).sort((a, b) => b.score - a.score),
      galleryCollections: gallery.map((item) => ({ galleryItemId: item.galleryItemId, title: item.title, status: item.status })),
      checkedAt: nowIso(),
    };
  }
}

export const contentPerformanceService = new ContentPerformanceService();
