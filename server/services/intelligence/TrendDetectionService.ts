import { analyticsEventRepository } from "../../repositories/AnalyticsEventRepository";
import { releaseRepository } from "../../repositories/ReleaseRepository";
import { intelligenceInsightRepository } from "../../repositories/operations/OperationsRepository";
import { id, nowIso, periodRange, trendLabel } from "./intelligenceShared";

export class TrendDetectionService {
  async detectTrends() {
    const [events, releases] = await Promise.all([
      analyticsEventRepository.list({ includeArchived: true }),
      releaseRepository.list({ includeArchived: true }),
    ]);
    const current = periodRange("week");
    const previousStart = new Date(current.periodStart);
    previousStart.setDate(previousStart.getDate() - 7);
    const currentEvents = events.filter((event) => event.occurredAt >= current.periodStart);
    const previousEvents = events.filter((event) => event.occurredAt >= previousStart.toISOString() && event.occurredAt < current.periodStart);
    const created = [];
    const label = trendLabel(currentEvents.length, previousEvents.length);
    if (label !== "stable") {
      created.push(await intelligenceInsightRepository.create({
        insightId: id("insight"),
        scope: "global",
        insightType: "trend",
        severity: label === "declining" ? "medium" : "info",
        title: `Audience trend is ${label.replace(/_/g, " ")}`,
        summary: `Current week has ${currentEvents.length} tracked events versus ${previousEvents.length} in the previous week.`,
        confidence: previousEvents.length ? Math.min(0.95, Math.abs(currentEvents.length - previousEvents.length) / Math.max(previousEvents.length, 1)) : 0.6,
        status: "open",
        detectedAt: nowIso(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        metadata: { currentEvents: currentEvents.length, previousEvents: previousEvents.length },
        schemaVersion: 1,
      }));
    }
    const genres = releases.reduce<Record<string, number>>((counts, release) => {
      const genre = release.genre || "unknown";
      counts[genre] = (counts[genre] ?? 0) + 1;
      return counts;
    }, {});
    const topGenre = Object.entries(genres).sort((a, b) => b[1] - a[1])[0];
    if (topGenre) {
      created.push(await intelligenceInsightRepository.create({
        insightId: id("insight"),
        scope: "global",
        insightType: "trend",
        severity: "low",
        title: `Most active genre is ${topGenre[0]}`,
        summary: `${topGenre[1]} releases are currently categorized as ${topGenre[0]}.`,
        confidence: 0.7,
        status: "open",
        detectedAt: nowIso(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        metadata: { genre: topGenre[0], count: topGenre[1] },
        schemaVersion: 1,
      }));
    }
    return { status: "ok", created, checkedAt: nowIso() };
  }
}

export const trendDetectionService = new TrendDetectionService();
