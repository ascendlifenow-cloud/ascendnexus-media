import { operationalReportRepository } from "../../repositories/operations/OperationsRepository";
import { contentHealthService } from "./ContentHealthService";
import { operationalMetricsService } from "./OperationalMetricsService";
import { optimizationRecommendationService } from "./OptimizationRecommendationService";
import { asRecord, asString, id, nowIso } from "./operationsShared";

const periodRange = (type: "daily" | "weekly" | "monthly" | "quarterly" | "yearly") => {
  const end = new Date();
  const start = new Date(end);
  if (type === "weekly") start.setDate(start.getDate() - 7);
  else if (type === "monthly") start.setMonth(start.getMonth() - 1);
  else if (type === "quarterly") start.setMonth(start.getMonth() - 3);
  else if (type === "yearly") start.setFullYear(start.getFullYear() - 1);
  else start.setDate(start.getDate() - 1);
  return { periodStart: start.toISOString(), periodEnd: end.toISOString() };
};

export class OperationalReportingService {
  listReports() {
    return operationalReportRepository.list({ includeArchived: true, sort: "generatedAt", direction: "desc", limit: 50 });
  }

  async generateReport(payload: unknown = {}, actorId = "system") {
    const body = asRecord(payload);
    const reportType = asString(body.reportType, asString(body.period, "daily")) as "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
    const [metrics, contentHealth, recommendations] = await Promise.all([
      operationalMetricsService.buildSnapshot(reportType),
      contentHealthService.buildHealth(),
      optimizationRecommendationService.listRecommendations(),
    ]);
    const range = periodRange(reportType);
    const generatedAt = nowIso();
    const openRecommendations = recommendations.filter((item) => item.status === "open").length;
    return operationalReportRepository.create({
      reportId: id("ops_report"),
      reportType,
      status: "generated",
      ...range,
      generatedAt,
      summary: `${reportType} operations report generated with ${metrics.blockingIssues.length} blockers, ${metrics.warnings.length} warnings, and ${openRecommendations} open optimization recommendations.`,
      sections: [
        { sectionId: "publishing", title: "Publishing", body: "Release workflow, publication, and verification metrics.", metrics: metrics.metrics },
        { sectionId: "health", title: "Content Health", body: `Content health is ${contentHealth.status}.`, warnings: contentHealth.warnings },
        { sectionId: "optimization", title: "Optimization", body: `${openRecommendations} recommendations are open.` },
      ],
      blockingIssues: [...metrics.blockingIssues, ...contentHealth.blockingIssues],
      warnings: [...metrics.warnings, ...contentHealth.warnings],
      createdBy: actorId,
      createdAt: generatedAt,
      metadata: { reportType },
      schemaVersion: 1,
    });
  }
}

export const operationalReportingService = new OperationalReportingService();
