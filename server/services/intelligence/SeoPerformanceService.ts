import { analyticsEventRepository } from "../../repositories/AnalyticsEventRepository";
import { productionSeoHealthService } from "../seo/ProductionSeoHealthService";
import { eventCount, nowIso } from "./intelligenceShared";

export class SeoPerformanceService {
  async buildSeoPerformance() {
    const [events, health] = await Promise.all([
      analyticsEventRepository.list({ includeArchived: true }),
      productionSeoHealthService.buildHealth(process.env.NODE_ENV || "development"),
    ]);
    return {
      seoClicks: eventCount(events, (event) => event.properties?.source === "seo"),
      searchRankings: "provider_pending",
      indexingStatus: health.overallStatus,
      warnings: health.warnings,
      blockingIssues: health.blockingIssues,
      checkedAt: nowIso(),
    };
  }
}

export const seoPerformanceService = new SeoPerformanceService();
