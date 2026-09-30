import { analyticsEventRepository } from "../../repositories/AnalyticsEventRepository";
import { distributionAnalyticsRepository } from "../../repositories/operations/OperationsRepository";
import { eventCount, metric, nowIso, periodRange } from "./intelligenceShared";

export class AudienceGrowthService {
  async buildAudienceDashboard() {
    const [events, analytics] = await Promise.all([
      analyticsEventRepository.list({ includeArchived: true }),
      distributionAnalyticsRepository.list({ includeArchived: true }),
    ]);
    return {
      thisWeek: eventCount(events, (event) => event.occurredAt >= periodRange("week").periodStart),
      thisMonth: eventCount(events, (event) => event.occurredAt >= periodRange("month").periodStart),
      followers: metric(analytics, "followers"),
      subscribers: metric(analytics, "subscribers"),
      returningVisitors: eventCount(events, (event) => Boolean(event.properties?.returningVisitor)),
      deviceTypes: {},
      geography: {},
      trafficSources: events.reduce<Record<string, number>>((acc, event) => {
        const source = String(event.properties?.source ?? "direct");
        acc[source] = (acc[source] ?? 0) + 1;
        return acc;
      }, {}),
      checkedAt: nowIso(),
    };
  }
}

export const audienceGrowthService = new AudienceGrowthService();
