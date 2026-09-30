import { analyticsEventRepository } from "../../repositories/AnalyticsEventRepository";
import { distributionAnalyticsRepository, growthForecastRepository } from "../../repositories/operations/OperationsRepository";
import { eventCount, id, metric, nowIso, periodRange } from "./intelligenceShared";

export class GrowthForecastService {
  async buildForecasts() {
    const [events, analytics] = await Promise.all([
      analyticsEventRepository.list({ includeArchived: true }),
      distributionAnalyticsRepository.list({ includeArchived: true }),
    ]);
    const lastWeek = eventCount(events, (event) => event.occurredAt >= periodRange("week").periodStart);
    const followers = metric(analytics, "followers") + metric(analytics, "subscribers");
    const created = [];
    for (const forecast of [
      { metric: "traffic" as const, currentValue: lastWeek, forecastValue: Math.round(lastWeek * 1.15) },
      { metric: "followers" as const, currentValue: followers, forecastValue: Math.round(followers * 1.1 + 5) },
      { metric: "publishing_volume" as const, currentValue: 0, forecastValue: 4 },
      { metric: "storage_growth" as const, currentValue: analytics.length, forecastValue: analytics.length + 25 },
      { metric: "processing_needs" as const, currentValue: 0, forecastValue: 8 },
    ]) {
      created.push(await growthForecastRepository.create({
        forecastId: id("forecast"),
        scope: "global",
        horizonDays: 30,
        confidence: 0.58,
        generatedAt: nowIso(),
        createdAt: nowIso(),
        metadata: { method: "baseline_linear_projection" },
        schemaVersion: 1,
        ...forecast,
      }));
    }
    return { status: "ok", forecasts: created, checkedAt: nowIso() };
  }

  listForecasts() {
    return growthForecastRepository.list({ includeArchived: true, sort: "generatedAt", direction: "desc", limit: 50 });
  }
}

export const growthForecastService = new GrowthForecastService();
