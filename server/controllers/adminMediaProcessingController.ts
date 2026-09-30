import type { IncomingMessage, ServerResponse } from "node:http";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { mediaProcessingJobService } from "../services/media/MediaProcessingJobService";
import { mediaWorkerHealthService } from "../services/media/MediaWorkerHealthService";
import { mediaAuditPersistenceService } from "../services/media/MediaAuditPersistenceService";
import { mediaDeadLetterService } from "../services/media/MediaDeadLetterService";
import { mediaProcessingRecoveryService } from "../services/media/MediaProcessingRecoveryService";
import { mediaQueueRegistry } from "../queues/MediaQueueRegistry";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { MediaApiError } from "../utils/media/mediaErrorUtils";
import type { MediaProcessingJobStatusValue, MediaProcessingJobType } from "../models/mediaModels";

export class AdminMediaProcessingController {
  async listJobs(request: IncomingMessage, response: ServerResponse, url: URL) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    sendJson(response, 200, {
      success: true,
      processingJobs: await mediaProcessingJobService.listJobs({
        assetId: url.searchParams.get("assetId") ?? undefined,
        uploadJobId: url.searchParams.get("uploadJobId") ?? undefined,
        status: url.searchParams.get("status") as MediaProcessingJobStatusValue | undefined,
        jobType: url.searchParams.get("jobType") as MediaProcessingJobType | undefined,
      }),
    });
  }

  async getJob(request: IncomingMessage, response: ServerResponse, processingJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    const job = await mediaProcessingJobService.getJob(processingJobId);
    if (!job) throw new MediaApiError("PROCESSING_JOB_NOT_FOUND", "Processing job was not found.", 404, "database");
    sendJson(response, 200, { success: true, processingJob: job });
  }

  async getAssetSummary(request: IncomingMessage, response: ServerResponse, assetId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    sendJson(response, 200, {
      success: true,
      summary: await mediaProcessingJobService.buildAssetProcessingSummary(assetId),
      processingJobs: await mediaProcessingJobService.getJobsForAsset(assetId),
    });
  }

  async retryJob(request: IncomingMessage, response: ServerResponse, processingJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    const job = await mediaProcessingJobService.retryJob(processingJobId);
    if (!job) throw new MediaApiError("PROCESSING_JOB_NOT_FOUND", "Processing job was not found.", 404, "database");
    await mediaAuditPersistenceService.record("processing_job_retried_by_admin", `Admin retried ${job.jobType} processing job`, {
      actorId: auth.adminId,
      entityType: "media_processing_job",
      entityId: processingJobId,
      metadata: { assetId: job.assetId, queueName: job.queueName },
    });
    sendJson(response, 200, { success: true, processingJob: job });
  }

  async cancelJob(request: IncomingMessage, response: ServerResponse, processingJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    const job = await mediaProcessingJobService.cancelJob(processingJobId);
    if (!job) throw new MediaApiError("PROCESSING_JOB_NOT_FOUND", "Processing job was not found.", 404, "database");
    await mediaAuditPersistenceService.record("processing_job_canceled_by_admin", `Admin canceled ${job.jobType} processing job`, {
      actorId: auth.adminId,
      entityType: "media_processing_job",
      entityId: processingJobId,
      metadata: { assetId: job.assetId, queueName: job.queueName },
    });
    sendJson(response, 200, { success: true, processingJob: job });
  }

  async health(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    const health = await mediaWorkerHealthService.getFullHealthReport();
    void mediaAuditPersistenceService.record("processing_health_check_run", "Admin ran media processing health check", {
      actorId: auth.adminId,
      entityType: "media_processing_health",
      entityId: "media-processing",
      metadata: { checkedAt: health.checkedAt, workersEnabled: health.workersEnabled },
    });
    sendJson(response, 200, { success: true, health });
  }

  async pauseQueue(request: IncomingMessage, response: ServerResponse, queueName: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.edit");
    mediaQueueRegistry.pauseQueue(queueName as never);
    await mediaAuditPersistenceService.record("processing_queue_paused", `Admin paused ${queueName} processing queue`, {
      actorId: auth.adminId,
      entityType: "media_processing_queue",
      entityId: queueName,
    });
    sendJson(response, 200, { success: true, queueName, queueHealth: mediaQueueRegistry.getQueueHealth() });
  }

  async resumeQueue(request: IncomingMessage, response: ServerResponse, queueName: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.edit");
    mediaQueueRegistry.resumeQueue(queueName as never);
    await mediaAuditPersistenceService.record("processing_queue_resumed", `Admin resumed ${queueName} processing queue`, {
      actorId: auth.adminId,
      entityType: "media_processing_queue",
      entityId: queueName,
    });
    sendJson(response, 200, { success: true, queueName, queueHealth: mediaQueueRegistry.getQueueHealth() });
  }

  async createJob(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    const body = await parseJsonBody(request) as Parameters<typeof mediaProcessingJobService.createJob>[0];
    const job = await mediaProcessingJobService.createAndEnqueueJob({ ...body, createdBy: auth.adminId });
    sendJson(response, 201, { success: true, processingJob: job });
  }

  async deadLetter(request: IncomingMessage, response: ServerResponse, url: URL) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    sendJson(response, 200, {
      success: true,
      deadLetterJobs: await mediaDeadLetterService.listDeadLetterJobs({ assetId: url.searchParams.get("assetId") ?? undefined }),
      summary: await mediaDeadLetterService.getDeadLetterSummary(),
    });
  }

  async retryDeadLetter(request: IncomingMessage, response: ServerResponse, processingJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    const job = await mediaDeadLetterService.retryDeadLetterJob(processingJobId);
    if (!job) throw new MediaApiError("PROCESSING_JOB_NOT_FOUND", "Dead-letter processing job was not found.", 404, "database");
    sendJson(response, 200, { success: true, processingJob: job });
  }

  async recovery(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    sendJson(response, 200, { success: true, report: await mediaProcessingRecoveryService.buildRecoveryReport() });
  }

  async recoverJob(request: IncomingMessage, response: ServerResponse, processingJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    const job = await mediaProcessingRecoveryService.recoverStalledJob(processingJobId);
    if (!job) throw new MediaApiError("PROCESSING_JOB_NOT_FOUND", "Recoverable processing job was not found.", 404, "database");
    sendJson(response, 200, { success: true, processingJob: job });
  }
}

export const adminMediaProcessingController = new AdminMediaProcessingController();
