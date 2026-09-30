import { mediaProcessingJobService } from "./MediaProcessingJobService";
import type { MediaProcessingJob } from "../../models/mediaModels";
import { shouldRetryProcessingJob } from "../../utils/media/processingRetryUtils";
import { classifyMediaProcessingError } from "../../utils/media/processingErrorUtils";

export class MediaProcessingRetryService {
  classifyError(error: unknown) {
    return classifyMediaProcessingError(error);
  }

  isRetryable(job: MediaProcessingJob, error: unknown): boolean {
    return shouldRetryProcessingJob(job, error);
  }

  calculateBackoff(attempt: number): number {
    return Math.min(60_000, 5_000 * Math.max(1, attempt) ** 2);
  }

  retryJob(processingJobId: string) {
    return mediaProcessingJobService.retryJob(processingJobId);
  }

  async retryFailedJobs(filters: { assetId?: string } = {}) {
    const jobs = await mediaProcessingJobService.listJobs(filters);
    const retryable = jobs.filter((job) => job.status === "failed" || job.status === "dead_letter" || job.status === "retrying");
    return Promise.all(retryable.map((job) => mediaProcessingJobService.retryJob(job.processingJobId)));
  }
}

export const mediaProcessingRetryService = new MediaProcessingRetryService();
