import type { DistributionDestination, DistributionJobRecord } from "../../models/operations/OperationsModels";
import { artistRepository } from "../../repositories/ArtistRepository";
import { galleryRepository } from "../../repositories/GalleryRepository";
import { releaseRepository } from "../../repositories/ReleaseRepository";
import { distributionJobRepository, platformUploadRepository } from "../../repositories/operations/OperationsRepository";
import { mediaTransformationService } from "./MediaTransformationService";
import { platformMetadataService } from "./PlatformMetadataService";
import { platformConnectorRegistry } from "./PlatformConnectorRegistry";
import { distributionVerificationService } from "./DistributionVerificationService";
import { distributionQueueService } from "./DistributionQueueService";
import { platformAnalyticsCollector } from "./PlatformAnalyticsCollector";
import { distributionRetryService } from "./DistributionRetryService";
import { distributionAuditService } from "./DistributionAuditService";
import { asDestinations, asRecord, asString, buildDistributionPipeline, id, nowIso } from "./distributionShared";

export class DistributionEngineService {
  async createJob(payload: unknown, actorId: string): Promise<DistributionJobRecord> {
    const body = asRecord(payload);
    const entityType = asString(body.entityType, "release") as DistributionJobRecord["entityType"];
    const entityId = asString(body.entityId);
    if (!entityId) throw new Error("Distribution entityId is required.");
    const destinations = asDestinations(body.destinations);
    const createdAt = nowIso();
    const job = await distributionJobRepository.create({
      distributionJobId: id("distribution_job"),
      entityType,
      entityId,
      assetId: asString(body.assetId) || undefined,
      destinations,
      status: "queued",
      priority: asString(body.priority, "normal") as DistributionJobRecord["priority"],
      scheduledFor: asString(body.scheduledFor) || undefined,
      queueName: "media_transformation",
      pipeline: buildDistributionPipeline(),
      retryCount: 0,
      maxRetries: typeof body.maxRetries === "number" ? body.maxRetries : 3,
      createdBy: actorId,
      createdAt,
      updatedAt: createdAt,
      metadata: asRecord(body.metadata),
      schemaVersion: 1,
    });
    await distributionAuditService.record({ distributionJobId: job.distributionJobId, eventType: "distribution_job_created", message: `Distribution job created for ${entityType}:${entityId}.`, actorId });
    return job;
  }

  listJobs() {
    return distributionJobRepository.list({ includeArchived: true, sort: "updatedAt", direction: "desc" });
  }

  async runJob(distributionJobId: string, actorId = "system") {
    const job = await distributionJobRepository.get(distributionJobId);
    if (!job) throw new Error("Distribution job not found.");
    await distributionJobRepository.update(distributionJobId, { status: "running", queueName: "media_transformation" });
    const blockers: string[] = [];
    const warnings: string[] = [];
    const entity = await this.loadEntity(job.entityType, job.entityId);
    if (!entity) blockers.push("Distribution entity was not found.");
    if (!this.isPublished(entity)) blockers.push("Distribution entity is not published.");
    if (!job.assetId && ["music_video", "short", "reel", "artwork", "promotional_graphic"].includes(job.entityType)) blockers.push("Required media asset is missing.");
    if (blockers.length) return this.failJob(job, blockers, actorId);

    await mediaTransformationService.planTransformations(distributionJobId, job.assetId, job.destinations);
    await mediaTransformationService.completePlanningOnly(distributionJobId);

    for (const destination of job.destinations) {
      const metadata = await platformMetadataService.buildMetadata(job.entityType, job.entityId, destination);
      const connector = platformConnectorRegistry.getConnector(destination);
      const validation = await connector.validate({ ...metadata, entityType: job.entityType, entityId: job.entityId });
      if (!validation.ok) {
        blockers.push(`${destination}: ${validation.message}`);
        continue;
      }
      const upload = await connector.upload({ ...metadata, entityType: job.entityType, entityId: job.entityId, canonicalUrl: this.canonicalFor(job.entityType, entity) });
      const createdUpload = await platformUploadRepository.create({
        uploadId: id("platform_upload"),
        distributionJobId,
        platform: destination,
        status: upload.ok ? "uploaded" : "failed",
        platformId: upload.platformId,
        platformUrl: upload.platformUrl,
        title: metadata.title,
        description: metadata.description,
        hashtags: metadata.hashtags,
        attemptCount: 1,
        lastAttemptAt: nowIso(),
        retryable: upload.retryable,
        failureReason: upload.ok ? undefined : upload.message,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        metadata: { keywords: metadata.keywords, categories: metadata.categories },
        schemaVersion: 1,
      });
      if (!upload.ok) {
        const severity = upload.retryable ? "warning" : "error";
        await distributionAuditService.record({ distributionJobId, platform: destination, eventType: "platform_upload_failed", severity, message: upload.message, actorId });
        (upload.retryable ? warnings : blockers).push(`${destination}: ${upload.message}`);
      } else {
        await distributionAuditService.record({ distributionJobId, platform: destination, eventType: "platform_upload_completed", message: `Uploaded to ${destination}.`, actorId, metadata: { uploadId: createdUpload.uploadId } });
      }
    }
    const verification = await distributionVerificationService.verifyJob(distributionJobId);
    if (verification.status === "failed") blockers.push("Upload verification failed.");
    const finalStatus = blockers.length ? "failed" : warnings.length ? "completed" : "completed";
    const updated = await distributionJobRepository.update(distributionJobId, {
      status: finalStatus,
      queueName: blockers.length ? "retry" : "analytics_sync",
      failureReason: blockers[0],
      completedAt: blockers.length ? undefined : nowIso(),
      updatedAt: nowIso(),
    });
    if (!blockers.length) await platformAnalyticsCollector.collect();
    await distributionAuditService.record({ distributionJobId, eventType: blockers.length ? "distribution_failed" : "distribution_completed", severity: blockers.length ? "error" : "info", message: blockers[0] ?? "Distribution completed.", actorId });
    return { job: updated, blockers, warnings, verification };
  }

  async dashboard() {
    const [jobs, connectors, queue, analytics, audit] = await Promise.all([
      this.listJobs(),
      platformConnectorRegistry.health(),
      distributionQueueService.getQueueStatus(),
      platformAnalyticsCollector.list(),
      distributionAuditService.list(),
    ]);
    return {
      jobs,
      queuedJobs: jobs.filter((job) => job.status === "queued"),
      runningJobs: jobs.filter((job) => job.status === "running"),
      completedJobs: jobs.filter((job) => job.status === "completed"),
      failedJobs: jobs.filter((job) => ["failed", "dead_letter"].includes(job.status)),
      retryQueue: jobs.filter((job) => ["retrying", "failed"].includes(job.status)),
      connectors,
      queue,
      analytics,
      audit,
      platformStats: connectors.map((connector) => ({
        platform: connector.platform,
        status: connector.status,
        authStatus: connector.authStatus,
        rateLimitStatus: connector.rateLimitStatus,
        errors: connector.errors.length,
      })),
      checkedAt: nowIso(),
    };
  }

  async retryFailures() {
    return distributionRetryService.retryFailedUploads();
  }

  private async failJob(job: DistributionJobRecord, blockers: string[], actorId: string) {
    const updated = await distributionJobRepository.update(job.distributionJobId, { status: "failed", failureReason: blockers[0], queueName: "retry", updatedAt: nowIso() });
    await distributionAuditService.record({ distributionJobId: job.distributionJobId, eventType: "distribution_failed", severity: "error", message: blockers[0], actorId });
    return { job: updated, blockers, warnings: [], verification: undefined };
  }

  private async loadEntity(entityType: string, entityId: string): Promise<Record<string, unknown> | undefined> {
    if (["release", "song", "album", "music_video"].includes(entityType)) return (await releaseRepository.get(entityId)) as Record<string, unknown> | undefined;
    if (entityType === "artist") return (await artistRepository.get(entityId)) as Record<string, unknown> | undefined;
    if (["gallery_item", "gallery_collection"].includes(entityType)) return (await galleryRepository.get(entityId)) as Record<string, unknown> | undefined;
    return { status: "published", publicationState: "published", title: entityType };
  }

  private isPublished(entity: Record<string, unknown>) {
    return entity.status === "published" || entity.publicationState === "published" || entity.status === "active";
  }

  private canonicalFor(entityType: string, entity: Record<string, unknown>) {
    const slug = String(entity.slug ?? "");
    if (entityType === "artist") return `/artists/${slug}`;
    if (["gallery_item", "gallery_collection"].includes(entityType)) return `/gallery/${slug}`;
    if (slug) return `/songs/${slug}`;
    return "/";
  }
}

export const distributionEngineService = new DistributionEngineService();
