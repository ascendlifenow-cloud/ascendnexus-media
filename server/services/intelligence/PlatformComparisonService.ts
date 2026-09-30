import { distributionAnalyticsRepository, platformConnectorRepository } from "../../repositories/operations/OperationsRepository";
import { metric, nowIso } from "./intelligenceShared";

export class PlatformComparisonService {
  async comparePlatforms() {
    const [analytics, connectors] = await Promise.all([
      distributionAnalyticsRepository.list({ includeArchived: true }),
      platformConnectorRepository.list({ includeArchived: true }),
    ]);
    return {
      platforms: connectors.map((connector) => {
        const records = analytics.filter((item) => item.platform === connector.platform);
        return {
          platform: connector.platform,
          status: connector.status,
          authStatus: connector.authStatus,
          views: metric(records, "views"),
          streams: metric(records, "streams"),
          likes: metric(records, "likes"),
          shares: metric(records, "shares"),
          comments: metric(records, "comments"),
          followers: metric(records, "followers"),
          score: metric(records, "views") + metric(records, "streams") * 2 + metric(records, "shares") * 3,
        };
      }).sort((a, b) => b.score - a.score),
      checkedAt: nowIso(),
    };
  }
}

export const platformComparisonService = new PlatformComparisonService();
