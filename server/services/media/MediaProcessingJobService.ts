import type {
  MediaAssetProcessingSummary,
  MediaProcessingJob,
  MediaProcessingJobInput,
  MediaProcessingJobOutput,
  MediaProcessingJobStatusValue,
  MediaProcessingJobType,
} from "../../models/mediaModels";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import { mediaQueueRegistry } from "../../queues/MediaQueueRegistry";
import { getQueueNameForJobType } from "../../queues/mediaQueueConfig";
import { mediaAuditPersistenceService } from "./MediaAuditPersistenceService";
import { jsonDatabase } from "./JsonDatabase";
import { getNextRetryAt, shouldRetryProcessingJob } from "../../utils/media/processingRetryUtils";
import { sanitizeProcessingErrorMessage } from "../../utils/media/processingErrorUtils";
import { mediaProcessingJobTransitionService } from "./MediaProcessingJobTransitionService";

export interface CreateMediaProcessingJobPayload {
  assetId: string;
  storageObjectId: string;
  uploadJobId?: string;
  jobType: MediaProcessingJobType;
  input: MediaProcessingJobInput;
  priority?: number;
  required?: boolean;
  maxAttempts?: number;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

export interface MediaProcessingJobFilters {
  assetId?: string;
  uploadJobId?: string;
  status?: MediaProcessingJobStatusValue;
  jobType?: MediaProcessingJobType;
}

export class MediaProcessingJobService {
  async createJob(payload: CreateMediaProcessingJobPayload): Promise<MediaProcessingJob> {
    const now = new Date().toISOString();
    const queueName = getQueueNameForJobType(payload.jobType);
    const job: MediaProcessingJob = {
      processingJobId: `processing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      assetId: payload.assetId,
      mediaAssetId: payload.assetId,
      storageObjectId: payload.storageObjectId,
      uploadJobId: payload.uploadJobId,
      jobType: payload.jobType,
      type: this.typeForJob(payload.jobType),
      queueName,
      status: "queued",
      priority: payload.priority ?? 50,
      progress: 0,
      attempts: 0,
      maxAttempts: payload.maxAttempts ?? mediaBackendConfig.mediaJobMaxAttempts,
      input: payload.input,
      outputs: [],
      errors: [],
      warnings: mediaBackendConfig.mediaWorkersEnabled ? [] : ["Media workers are disabled; job is queued for later processing."],
      createdBy: payload.createdBy,
      createdAt: now,
      updatedAt: now,
      metadata: { required: payload.required ?? false, ...(payload.metadata ?? {}) },
    };
    await jsonDatabase.update((data) => data.mediaProcessingJobs.push(job));
    await mediaAuditPersistenceService.record("media_processing_job_created", `Created ${payload.jobType} processing job`, {
      actorId: payload.createdBy,
      entityType: "media_processing_job",
      entityId: job.processingJobId,
      metadata: { assetId: payload.assetId, queueName },
    });
    return job;
  }

  async enqueueJob(processingJobId: string): Promise<MediaProcessingJob | null> {
    const job = await this.getJob(processingJobId);
    if (!job) return null;
    mediaQueueRegistry.enqueueJob(job);
    return job;
  }

  async createAndEnqueueJob(payload: CreateMediaProcessingJobPayload): Promise<MediaProcessingJob> {
    const job = await this.createJob(payload);
    await this.enqueueJob(job.processingJobId);
    return job;
  }

  async getJob(processingJobId: string): Promise<MediaProcessingJob | null> {
    const data = await jsonDatabase.read();
    return data.mediaProcessingJobs.find((job) => job.processingJobId === processingJobId) ?? null;
  }

  async listJobs(filters: MediaProcessingJobFilters = {}): Promise<MediaProcessingJob[]> {
    const data = await jsonDatabase.read();
    return data.mediaProcessingJobs
      .filter((job) => !filters.assetId || job.assetId === filters.assetId)
      .filter((job) => !filters.uploadJobId || job.uploadJobId === filters.uploadJobId)
      .filter((job) => !filters.status || job.status === filters.status)
      .filter((job) => !filters.jobType || job.jobType === filters.jobType)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateJobStatus(processingJobId: string, updates: Partial<MediaProcessingJob>): Promise<MediaProcessingJob | null> {
    let updated: MediaProcessingJob | null = null;
    await jsonDatabase.update((data) => {
      data.mediaProcessingJobs = data.mediaProcessingJobs.map((job) => {
        if (job.processingJobId !== processingJobId) return job;
        if (updates.status) mediaProcessingJobTransitionService.assertTransition(job.status, updates.status);
        updated = {
          ...job,
          ...updates,
          metadata: { ...(job.metadata ?? {}), ...(updates.metadata ?? {}) },
          warnings: updates.warnings ?? job.warnings,
          errors: updates.errors ?? job.errors,
          updatedAt: new Date().toISOString(),
        };
        return updated;
      });
    });
    return updated;
  }

  async updateJobProgress(processingJobId: string, progress: number, message?: string): Promise<MediaProcessingJob | null> {
    return this.updateJobStatus(processingJobId, {
      progress: Math.max(0, Math.min(100, Math.round(progress))),
      metadata: message ? { progressMessage: message } : undefined,
    });
  }

  async markJobCompleted(processingJobId: string, outputs: MediaProcessingJobOutput[] = []): Promise<MediaProcessingJob | null> {
    const hasReady = outputs.some((output) => output.status === "ready");
    const allSkipped = outputs.length > 0 && outputs.every((output) => output.status === "skipped");
    const failedOptionalOutputs = outputs.filter((output) => output.status === "failed").map((output) => `${output.outputType} failed.`);
    const job = await this.updateJobStatus(processingJobId, {
      status: allSkipped && !hasReady ? "skipped" : "completed",
      progress: 100,
      outputs,
      warnings: failedOptionalOutputs.length ? failedOptionalOutputs : undefined,
      completedAt: new Date().toISOString(),
    });
    if (job) await mediaAuditPersistenceService.record("media_processing_job_completed", `Completed ${job.jobType} processing job`, {
      actorId: job.createdBy,
      entityType: "media_processing_job",
      entityId: processingJobId,
      metadata: { assetId: job.assetId, outputCount: outputs.length },
    });
    return job;
  }

  async markJobFailed(processingJobId: string, error: unknown): Promise<MediaProcessingJob | null> {
    const current = await this.getJob(processingJobId);
    if (!current) return null;
    const message = sanitizeProcessingErrorMessage(error);
    const nextAttempts = current.attempts;
    if (shouldRetryProcessingJob(current, error)) {
      return this.updateJobStatus(processingJobId, {
        status: "retrying",
        attempts: nextAttempts,
        nextRetryAt: getNextRetryAt(nextAttempts),
        errors: [...current.errors, message],
      });
    }
    const failed = await this.updateJobStatus(processingJobId, {
      status: nextAttempts >= current.maxAttempts ? "dead_letter" : "failed",
      attempts: nextAttempts,
      failedAt: new Date().toISOString(),
      errors: [...current.errors, message],
      progress: 100,
    });
    if (failed?.status === "dead_letter") await this.moveToDeadLetter(processingJobId, message);
    await mediaAuditPersistenceService.record("media_processing_job_failed", `Failed ${current.jobType} processing job`, {
      actorId: current.createdBy,
      entityType: "media_processing_job",
      entityId: processingJobId,
      metadata: { assetId: current.assetId },
    });
    return failed;
  }

  async retryJob(processingJobId: string): Promise<MediaProcessingJob | null> {
    const job = await this.updateJobStatus(processingJobId, { status: "queued", progress: 0, errors: [], nextRetryAt: undefined });
    if (job) {
      mediaQueueRegistry.enqueueJob(job);
      await mediaAuditPersistenceService.record("media_processing_job_retried", `Retried ${job.jobType} processing job`, {
        actorId: job.createdBy,
        entityType: "media_processing_job",
        entityId: processingJobId,
        metadata: { assetId: job.assetId },
      });
    }
    return job;
  }

  async cancelJob(processingJobId: string): Promise<MediaProcessingJob | null> {
    const job = await this.updateJobStatus(processingJobId, { status: "canceled", progress: 100, completedAt: new Date().toISOString() });
    if (job) await mediaAuditPersistenceService.record("media_processing_job_canceled", `Canceled ${job.jobType} processing job`, {
      actorId: job.createdBy,
      entityType: "media_processing_job",
      entityId: processingJobId,
      metadata: { assetId: job.assetId },
    });
    return job;
  }

  async moveToDeadLetter(processingJobId: string, reason: string): Promise<MediaProcessingJob | null> {
    const job = await this.updateJobStatus(processingJobId, { status: "dead_letter", errors: [sanitizeProcessingErrorMessage(reason)] });
    if (job) {
      mediaQueueRegistry.getQueue("media-dead-letter").push(job);
      await mediaAuditPersistenceService.record("media_processing_dead_lettered", `Moved ${job.jobType} processing job to dead letter`, {
        actorId: job.createdBy,
        entityType: "media_processing_job",
        entityId: processingJobId,
        metadata: { assetId: job.assetId },
      });
    }
    return job;
  }

  getJobsForAsset(assetId: string) {
    return this.listJobs({ assetId });
  }

  getJobsForUpload(uploadJobId: string) {
    return this.listJobs({ uploadJobId });
  }

  async buildAssetProcessingSummary(assetId: string): Promise<MediaAssetProcessingSummary> {
    const jobs = await this.getJobsForAsset(assetId);
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter((job) => job.status === "completed").length;
    const skippedJobs = jobs.filter((job) => job.status === "skipped").length;
    const failedJobs = jobs.filter((job) => job.status === "failed" || job.status === "dead_letter").length;
    const activeJobs = jobs.filter((job) => job.status === "active" || job.status === "processing" || job.status === "retrying").length;
    const queuedJobs = jobs.filter((job) => job.status === "queued" || job.status === "delayed").length;
    const requiredFailures = jobs.filter((job) => job.metadata?.required === true && (job.status === "failed" || job.status === "dead_letter"));
    const optionalFailures = jobs.filter((job) => job.metadata?.required !== true && (job.status === "failed" || job.status === "dead_letter"));
    const warnings = [
      ...jobs.flatMap((job) => job.warnings),
      ...optionalFailures.map((job) => `${job.jobType} failed or needs review.`),
    ];
    const progress = totalJobs ? Math.round(jobs.reduce((sum, job) => sum + job.progress, 0) / totalJobs) : 0;
    const toReadiness = (job: MediaProcessingJob) => ({
      outputType: job.jobType,
      ready: job.status === "completed" || job.status === "skipped",
      status: job.status,
      processingJobId: job.processingJobId,
      updatedAt: job.updatedAt,
    });
    const requiredOutputs = jobs.filter((job) => job.metadata?.required === true).map(toReadiness);
    const optionalOutputs = jobs.filter((job) => job.metadata?.required !== true).map(toReadiness);
    return {
      assetId,
      overallStatus: totalJobs === 0 ? "not_started" : requiredFailures.length ? "blocked" : failedJobs ? "failed" : activeJobs ? "processing" : queuedJobs ? "queued" : warnings.length ? "completed_with_warnings" : "completed",
      totalJobs,
      queuedJobs,
      activeJobs,
      completedJobs,
      failedJobs,
      skippedJobs,
      progress,
      requiredOutputsReady: requiredFailures.length === 0 && requiredOutputs.every((output) => output.ready),
      optionalOutputsReady: optionalFailures.length === 0,
      requiredOutputs,
      optionalOutputs,
      blockingIssues: requiredFailures.map((job) => `${job.jobType} failed.`),
      warnings,
      updatedAt: new Date().toISOString(),
    };
  }

  private typeForJob(jobType: MediaProcessingJobType): MediaProcessingJob["type"] {
    if (jobType.startsWith("image_") || jobType === "blur_placeholder") return "image";
    if (jobType.startsWith("audio_")) return "audio";
    if (jobType.startsWith("storage_") || jobType === "checksum_verify") return "storage";
    if (jobType === "cdn_invalidate") return "cdn";
    return "maintenance";
  }
}

export const mediaProcessingJobService = new MediaProcessingJobService();
