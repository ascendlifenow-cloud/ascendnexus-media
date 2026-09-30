import type { MediaAssetProcessingSummary, MediaProcessingHealth, MediaProcessingJob } from "../../models/media";
import { mediaProcessingApiService } from "../../services/media/MediaProcessingApiService";

export class AdminMediaProcessingService {
  getProcessingHealth(): Promise<{ success: boolean; health?: MediaProcessingHealth; errors?: string[] }> {
    return mediaProcessingApiService.getHealth();
  }

  listProcessingJobs(): Promise<{ success: boolean; processingJobs: MediaProcessingJob[]; errors?: string[] }> {
    return mediaProcessingApiService.listJobs();
  }

  getProcessingJob(processingJobId: string): Promise<{ success: boolean; processingJob?: MediaProcessingJob; errors?: string[] }> {
    return mediaProcessingApiService.getProcessingJob(processingJobId);
  }

  getAssetProcessingSummary(assetId: string): Promise<{ success: boolean; summary?: MediaAssetProcessingSummary; processingJobs?: MediaProcessingJob[]; errors?: string[] }> {
    return mediaProcessingApiService.getAssetSummary(assetId);
  }

  retryProcessingJob(processingJobId: string) {
    return mediaProcessingApiService.retryJob(processingJobId);
  }

  cancelProcessingJob(processingJobId: string) {
    return mediaProcessingApiService.cancelJob(processingJobId);
  }

  pauseQueue(queueName: string) {
    return mediaProcessingApiService.pauseQueue(queueName);
  }

  resumeQueue(queueName: string) {
    return mediaProcessingApiService.resumeQueue(queueName);
  }

  async getQueueHealth() {
    const health = await this.getProcessingHealth();
    return health.health?.queueCounts ?? [];
  }

  async getProcessingStats() {
    const [jobs, health] = await Promise.all([this.listProcessingJobs(), this.getProcessingHealth()]);
    return { jobs: jobs.processingJobs ?? [], health: health.health };
  }
}

export const adminMediaProcessingService = new AdminMediaProcessingService();
