import type { MediaProcessingJob, MediaProcessingJobOutput } from "../models/mediaModels";
import { mediaProcessingJobService } from "../services/media/MediaProcessingJobService";
import { mediaAuditPersistenceService } from "../services/media/MediaAuditPersistenceService";
import { cleanupProcessingTempDir, createProcessingTempDir } from "../utils/media/temporaryFileUtils";
import { assertProcessingMaintainsFullSongPrivacy } from "../utils/media/processingPrivacyUtils";

export abstract class BaseMediaWorker {
  private running = false;
  private lastJobAt: string | undefined;
  private failedJobCount = 0;

  constructor(
    readonly workerName: string,
    readonly queueName: string,
    readonly concurrency: number,
  ) {}

  start(): void {
    this.running = true;
  }

  async processJob(job: MediaProcessingJob): Promise<MediaProcessingJob | null> {
    this.running = true;
    this.lastJobAt = new Date().toISOString();
    await createProcessingTempDir(job.processingJobId);
    await mediaProcessingJobService.updateJobStatus(job.processingJobId, {
      status: "active",
      attempts: job.attempts + 1,
      startedAt: new Date().toISOString(),
      progress: Math.max(job.progress, 5),
    });
    await mediaAuditPersistenceService.record("media_processing_job_started", `Started ${job.jobType} processing job`, {
      actorId: job.createdBy,
      entityType: "media_processing_job",
      entityId: job.processingJobId,
      metadata: { assetId: job.assetId, workerName: this.workerName },
    });
    try {
      await this.reportProgress(job.processingJobId, 20, "Processing started.");
      const outputs = await this.execute(job);
      assertProcessingMaintainsFullSongPrivacy(job, outputs);
      await this.reportProgress(job.processingJobId, 90, "Persisting processing outputs.");
      const completed = await this.completeJob(job.processingJobId, outputs);
      await cleanupProcessingTempDir(job.processingJobId);
      return completed;
    } catch (error) {
      this.failedJobCount += 1;
      await cleanupProcessingTempDir(job.processingJobId);
      return this.failJob(job.processingJobId, error);
    }
  }

  async reportProgress(processingJobId: string, progress: number, message?: string) {
    return mediaProcessingJobService.updateJobProgress(processingJobId, progress, message);
  }

  async completeJob(processingJobId: string, outputs: MediaProcessingJobOutput[]) {
    return mediaProcessingJobService.markJobCompleted(processingJobId, outputs);
  }

  async failJob(processingJobId: string, error: unknown) {
    return mediaProcessingJobService.markJobFailed(processingJobId, error);
  }

  async shutdown(): Promise<void> {
    this.running = false;
  }

  getHealth() {
    return {
      running: this.running,
      concurrency: this.concurrency,
      lastJobAt: this.lastJobAt,
      failedJobCount: this.failedJobCount,
      message: this.running ? "Worker is ready." : "Worker is stopped.",
    };
  }

  protected abstract execute(job: MediaProcessingJob): Promise<MediaProcessingJobOutput[]>;
}
