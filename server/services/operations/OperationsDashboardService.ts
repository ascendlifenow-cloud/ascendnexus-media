import { campaignScheduleRepository, releaseWorkflowRepository } from "../../repositories/operations/OperationsRepository";
import { mediaWorkerHealthService } from "../media/MediaWorkerHealthService";
import { mediaPublicationOrchestrationService } from "../publication/MediaPublicationOrchestrationService";
import { productionHealthCheckRegistry } from "../observability/ProductionHealthCheckRegistry";
import { contentHealthService } from "./ContentHealthService";
import { growthAnalyticsService } from "./GrowthAnalyticsService";
import { homepageAutomationService } from "./HomepageAutomationService";
import { operationalMetricsService } from "./OperationalMetricsService";
import { optimizationRecommendationService } from "./OptimizationRecommendationService";
import { publishingCalendarService } from "./PublishingCalendarService";
import { nowIso } from "./operationsShared";

export class OperationsDashboardService {
  async buildOverview() {
    const today = new Date().toISOString().slice(0, 10);
    const [workflows, calendar, campaigns, metrics, contentHealth, growth, recommendations, workerHealth, publicationHealth, launchHealth, homepageAutomation] = await Promise.all([
      releaseWorkflowRepository.list({ includeArchived: true, sort: "scheduledFor", direction: "asc" }),
      publishingCalendarService.listEvents(),
      campaignScheduleRepository.list({ includeArchived: true, sort: "scheduledFor", direction: "asc" }),
      operationalMetricsService.getLatestSnapshot(),
      contentHealthService.buildHealth(),
      growthAnalyticsService.buildGrowthSummary(),
      optimizationRecommendationService.listRecommendations(),
      mediaWorkerHealthService.getFullHealthReport(),
      mediaPublicationOrchestrationService.getPublicationHealth(),
      productionHealthCheckRegistry.runAllChecks(),
      homepageAutomationService.buildAutomationPlan(),
    ]);
    return {
      today: {
        releases: workflows.filter((workflow) => workflow.scheduledFor?.startsWith(today)),
        campaigns: campaigns.filter((campaign) => campaign.scheduledFor?.startsWith(today)),
      },
      upcomingReleases: workflows.filter((workflow) => workflow.status === "scheduled").slice(0, 12),
      failedReleases: workflows.filter((workflow) => ["failed", "paused"].includes(workflow.status)),
      pendingApprovals: workflows.filter((workflow) => workflow.status.endsWith("_review")),
      queues: {
        mediaProcessing: workerHealth.queueCounts,
        publication: publicationHealth,
        social: campaigns.filter((campaign) => campaign.campaignType === "social" && ["draft", "scheduled", "queued"].includes(campaign.status)).length,
        email: campaigns.filter((campaign) => ["newsletter", "email"].includes(campaign.campaignType) && ["draft", "scheduled", "queued"].includes(campaign.status)).length,
      },
      calendar,
      metrics,
      contentHealth,
      growth,
      homepageAutomation,
      recommendations: recommendations.filter((recommendation) => recommendation.status === "open").slice(0, 20),
      operationalAlerts: [...metrics.blockingIssues, ...contentHealth.blockingIssues, ...workerHealth.errors],
      launchHealth,
      checkedAt: nowIso(),
    };
  }
}

export const operationsDashboardService = new OperationsDashboardService();
