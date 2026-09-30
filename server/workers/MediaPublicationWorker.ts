import { mediaBackendConfig } from "../config/mediaBackendConfig";
import { mediaQueueNames } from "../queues/mediaQueueConfig";
import { mediaPublicationOrchestrationService } from "../services/publication/MediaPublicationOrchestrationService";

export class MediaPublicationWorker {
  readonly workerName = "media-publication-worker";
  readonly queueName = mediaQueueNames.publication;
  private running = false;
  private lastJobAt: string | undefined;
  private failedJobCount = 0;

  start(): void {
    this.running = true;
  }

  async processOperation(publicationOperationId: string) {
    this.running = true;
    this.lastJobAt = new Date().toISOString();
    try {
      return await mediaPublicationOrchestrationService.startPublication(publicationOperationId);
    } catch (error) {
      this.failedJobCount += 1;
      throw error;
    }
  }

  getHealth() {
    return {
      running: this.running,
      concurrency: mediaBackendConfig.mediaPublicationWorkerConcurrency,
      lastJobAt: this.lastJobAt,
      failedJobCount: this.failedJobCount,
      message: this.running ? "Publication worker is ready." : "Publication worker is stopped.",
    };
  }
}
