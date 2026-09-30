import { mediaProcessingJobService } from "./MediaProcessingJobService";

const ACTIVE_STATUSES = new Set(["active", "processing", "retrying"]);

export class MediaProcessingRecoveryService {
  async findStalledJobs(maxAgeMs = 30 * 60 * 1000) {
    const jobs = await mediaProcessingJobService.listJobs();
    const cutoff = Date.now() - maxAgeMs;
    return jobs.filter((job) => ACTIVE_STATUSES.has(job.status) && Date.parse(job.updatedAt) < cutoff);
  }

  async findProcessingJobsPastTimeout(maxAgeMs = 60 * 60 * 1000) {
    return this.findStalledJobs(maxAgeMs);
  }

  async recoverStalledJob(processingJobId: string) {
    const job = await mediaProcessingJobService.getJob(processingJobId);
    if (!job || !ACTIVE_STATUSES.has(job.status)) return null;
    return mediaProcessingJobService.updateJobStatus(processingJobId, {
      status: "queued",
      progress: 0,
      warnings: [...job.warnings, "Recovered from stale active processing state."],
      metadata: { recoveredAt: new Date().toISOString() },
    });
  }

  async markUnrecoverableJob(processingJobId: string) {
    return mediaProcessingJobService.moveToDeadLetter(processingJobId, "Processing job was marked unrecoverable by recovery scan.");
  }

  async buildRecoveryReport() {
    const stalled = await this.findStalledJobs();
    return {
      status: stalled.length ? "warnings" : "healthy",
      stalledJobCount: stalled.length,
      stalledJobs: stalled.map((job) => ({
        processingJobId: job.processingJobId,
        jobType: job.jobType,
        status: job.status,
        updatedAt: job.updatedAt,
      })),
      checkedAt: new Date().toISOString(),
    };
  }
}

export const mediaProcessingRecoveryService = new MediaProcessingRecoveryService();
