import { mediaProcessingJobService } from "./MediaProcessingJobService";

export class MediaDeadLetterService {
  async listDeadLetterJobs(filters: { assetId?: string } = {}) {
    const jobs = await mediaProcessingJobService.listJobs(filters);
    return jobs.filter((job) => job.status === "dead_letter");
  }

  async retryDeadLetterJob(processingJobId: string) {
    const job = await mediaProcessingJobService.getJob(processingJobId);
    if (!job || job.status !== "dead_letter") return null;
    return mediaProcessingJobService.retryJob(processingJobId);
  }

  async dismissOptionalDeadLetterJob(processingJobId: string, reason: string) {
    const job = await mediaProcessingJobService.getJob(processingJobId);
    if (!job || job.status !== "dead_letter" || job.metadata?.required === true) return null;
    return mediaProcessingJobService.updateJobStatus(processingJobId, {
      status: "skipped",
      warnings: [...job.warnings, reason],
      metadata: { dismissedDeadLetter: true, dismissReason: reason },
    });
  }

  async getDeadLetterSummary() {
    const jobs = await this.listDeadLetterJobs();
    return {
      total: jobs.length,
      required: jobs.filter((job) => job.metadata?.required === true).length,
      optional: jobs.filter((job) => job.metadata?.required !== true).length,
      byJobType: jobs.reduce<Record<string, number>>((acc, job) => {
        acc[job.jobType] = (acc[job.jobType] ?? 0) + 1;
        return acc;
      }, {}),
    };
  }
}

export const mediaDeadLetterService = new MediaDeadLetterService();
