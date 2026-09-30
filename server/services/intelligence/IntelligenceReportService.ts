import type { IntelligenceReportRecord } from "../../models/operations/OperationsModels";
import { intelligenceInsightRepository, intelligenceReportRepository } from "../../repositories/operations/OperationsRepository";
import { artistIntelligenceService } from "./ArtistIntelligenceService";
import { platformComparisonService } from "./PlatformComparisonService";
import { id, nowIso, periodRange } from "./intelligenceShared";

export class IntelligenceReportService {
  listReports() {
    return intelligenceReportRepository.list({ includeArchived: true, sort: "generatedAt", direction: "desc", limit: 100 });
  }

  async generateReport(reportType: IntelligenceReportRecord["reportType"] = "monthly_growth", actorId = "system") {
    const [dashboard, platformComparison, insights] = await Promise.all([
      artistIntelligenceService.buildGlobalDashboard(),
      platformComparisonService.comparePlatforms(),
      intelligenceInsightRepository.list({ includeArchived: true, sort: "detectedAt", direction: "desc", limit: 20 }),
    ]);
    const range = periodRange(reportType.includes("daily") ? "day" : reportType.includes("weekly") ? "week" : reportType.includes("quarterly") ? "quarter" : reportType.includes("annual") ? "year" : "month");
    return intelligenceReportRepository.create({
      intelligenceReportId: id("intel_report"),
      reportType,
      scope: "global",
      status: "generated",
      periodStart: range.periodStart,
      periodEnd: range.periodEnd,
      generatedAt: nowIso(),
      summary: `${reportType.replace(/_/g, " ")} generated with ${dashboard.topArtists.length} ranked artists and ${platformComparison.platforms.length} platform records.`,
      metrics: {
        topArtistScore: Number(dashboard.topArtists[0]?.score ?? 0),
        websiteGrowth: Number(dashboard.websiteGrowth ?? 0),
        seoGrowth: Number(dashboard.seoGrowth ?? 0),
        followerGrowth: Number(dashboard.followerGrowth ?? 0),
        releaseVelocity: Number(dashboard.releaseVelocity ?? 0),
      },
      insights: insights.slice(0, 10).map((insight) => insight.title),
      recommendations: insights.filter((insight) => insight.insightType === "recommendation").slice(0, 10).map((insight) => insight.summary),
      warnings: platformComparison.platforms.filter((platform) => platform.status === "needs_configuration").length ? ["Some external platform connectors need configuration before live provider intelligence is available."] : [],
      createdBy: actorId,
      createdAt: nowIso(),
      metadata: {},
      schemaVersion: 1,
    });
  }
}

export const intelligenceReportService = new IntelligenceReportService();
