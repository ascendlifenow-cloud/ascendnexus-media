import { artistRepository } from "../../repositories/ArtistRepository";
import { releaseRepository } from "../../repositories/ReleaseRepository";
import { galleryRepository } from "../../repositories/GalleryRepository";
import { publicationOperationRepository } from "../../repositories/PublicationRepository";
import { mediaWorkerHealthService } from "../media/MediaWorkerHealthService";
import { mediaPublicationOrchestrationService } from "../publication/MediaPublicationOrchestrationService";
import { productionHealthCheckRegistry } from "../observability/ProductionHealthCheckRegistry";
import { campaignScheduleRepository, operationalMetricsSnapshotRepository, releaseVerificationRepository, releaseWorkflowRepository } from "../../repositories/operations/OperationsRepository";
import { id, nowIso } from "./operationsShared";

export class OperationalMetricsService {
  async buildSnapshot(period: "hourly" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly" = "daily") {
    const [artists, releases, gallery, publications, workflows, verifications, campaigns, workerHealth, publicationHealth, launchHealth] = await Promise.all([
      artistRepository.list({ includeArchived: true }),
      releaseRepository.list({ includeArchived: true }),
      galleryRepository.list({ includeArchived: true }),
      publicationOperationRepository.list({ includeArchived: true }),
      releaseWorkflowRepository.list({ includeArchived: true }),
      releaseVerificationRepository.list({ includeArchived: true }),
      campaignScheduleRepository.list({ includeArchived: true }),
      mediaWorkerHealthService.getFullHealthReport(),
      mediaPublicationOrchestrationService.getPublicationHealth(),
      productionHealthCheckRegistry.runAllChecks(),
    ]);
    const publishedReleases = releases.filter((release) => release.status === "published" && release.publicationState === "published").length;
    const failedPublications = publications.filter((operation) => operation.status === "failed").length;
    const completedPublications = publications.filter((operation) => operation.status === "completed").length;
    const verified = verifications.filter((item) => item.status === "passed").length;
    const metrics = {
      songsReleased: publishedReleases,
      albumsReleased: workflows.filter((workflow) => workflow.releaseType === "album" && ["published", "verified"].includes(workflow.status)).length,
      artistsActive: artists.filter((artist) => artist.status === "published" || artist.publicationState === "published").length,
      publishingSuccessRate: completedPublications + failedPublications ? completedPublications / (completedPublications + failedPublications) : 0,
      publishingFailures: failedPublications,
      pendingApprovals: workflows.filter((workflow) => workflow.status.endsWith("_review")).length,
      scheduledReleases: workflows.filter((workflow) => workflow.status === "scheduled").length,
      failedReleases: workflows.filter((workflow) => workflow.status === "failed" || workflow.status === "paused").length,
      releaseVerificationRate: verifications.length ? verified / verifications.length : 0,
      galleryItems: gallery.length,
      socialCampaignsScheduled: campaigns.filter((campaign) => campaign.campaignType === "social" && campaign.status === "scheduled").length,
      newsletterCampaignsScheduled: campaigns.filter((campaign) => campaign.campaignType === "newsletter" && campaign.status === "scheduled").length,
      queueWarnings: workerHealth.warnings.length,
      queueErrors: workerHealth.errors.length,
    };
    const warnings = [
      ...workerHealth.warnings,
      ...(publicationHealth.warnings ?? []),
      ...(launchHealth.overallStatus === "healthy" ? [] : [`Launch health is ${launchHealth.overallStatus}.`]),
    ];
    const blockingIssues = [
      ...workerHealth.errors,
      ...(publicationHealth.errors ?? []),
      ...launchHealth.criticalFailures.map((failure) => `Critical service unavailable: ${failure}`),
    ];
    return operationalMetricsSnapshotRepository.create({
      snapshotId: id("ops_metrics"),
      period,
      measuredAt: nowIso(),
      metrics,
      warnings,
      blockingIssues,
      createdAt: nowIso(),
      metadata: { publicationStatus: publicationHealth.status, launchStatus: launchHealth.overallStatus },
      schemaVersion: 1,
    });
  }

  async getLatestSnapshot() {
    const existing = await operationalMetricsSnapshotRepository.list({ sort: "measuredAt", direction: "desc", limit: 1, includeArchived: true });
    return existing[0] ?? this.buildSnapshot();
  }
}

export const operationalMetricsService = new OperationalMetricsService();
