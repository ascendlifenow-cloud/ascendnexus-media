import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import { mediaQueueRegistry } from "../../queues/MediaQueueRegistry";
import { ImageProcessingWorker } from "../../workers/ImageProcessingWorker";
import { AudioProcessingWorker } from "../../workers/AudioProcessingWorker";
import { MediaStorageOperationsWorker } from "../../workers/MediaStorageOperationsWorker";
import { MediaCdnOperationsWorker } from "../../workers/MediaCdnOperationsWorker";
import { MediaPublicationWorker } from "../../workers/MediaPublicationWorker";
import { mediaPublicationOrchestrationService } from "../publication/MediaPublicationOrchestrationService";
import { mediaProcessingToolService } from "./MediaProcessingToolService";

export class MediaWorkerHealthService {
  checkRedis() {
    return {
      redisConnected: Boolean(mediaBackendConfig.mediaQueueRedisUrl),
      message: mediaBackendConfig.mediaQueueRedisUrl ? "Redis URL configured for durable queue mode." : "Redis is not configured; in-process fallback is allowed only outside staging/production.",
    };
  }

  checkQueues() {
    return mediaQueueRegistry.getQueueHealth();
  }

  checkImageWorker() {
    return new ImageProcessingWorker().getHealth();
  }

  checkAudioWorker() {
    return new AudioProcessingWorker().getHealth();
  }

  checkStorageWorker() {
    return new MediaStorageOperationsWorker().getHealth();
  }

  checkCdnWorker() {
    return new MediaCdnOperationsWorker().getHealth();
  }

  checkPublicationWorker() {
    return new MediaPublicationWorker().getHealth();
  }

  async checkExternalTools() {
    return mediaProcessingToolService.getHealth();
  }

  async getPublicationHealth() {
    const operations = await mediaPublicationOrchestrationService.listPublicationOperations();
    const active = operations.filter((operation) => ["requested", "validating", "waiting_for_processing", "promoting_storage", "updating_records", "activating_delivery", "verifying_sync", "rolling_back"].includes(operation.status));
    return {
      publicationWorker: this.checkPublicationWorker(),
      activePublicationJobs: active.length,
      failedPublicationJobs: operations.filter((operation) => operation.status === "failed" || operation.status === "blocked").length,
      oldestPendingPublication: active.at(-1)?.requestedAt,
      publicSyncServiceAvailable: true,
      storagePromotionAvailable: true,
    };
  }

  async getFullHealthReport() {
    const redis = this.checkRedis();
    const tools = await this.checkExternalTools();
    const publicationWorker = this.checkPublicationWorker();
    const warnings = [
      redis.message,
      ...tools.warnings,
      ...(!mediaBackendConfig.mediaWorkersEnabled ? ["Media workers are disabled by configuration."] : []),
      ...(!redis.redisConnected ? ["Durable Redis/BullMQ mode is not active in this environment."] : []),
    ];
    const errors = [
      ...tools.errors,
      ...(mediaBackendConfig.mediaWorkersEnabled && !redis.redisConnected ? ["Workers are enabled but Redis is not configured."] : []),
    ];
    return {
      redisConnected: redis.redisConnected,
      workersEnabled: mediaBackendConfig.mediaWorkersEnabled,
      imageWorker: this.checkImageWorker(),
      audioWorker: this.checkAudioWorker(),
      storageWorker: this.checkStorageWorker(),
      cdnWorker: this.checkCdnWorker(),
      publicationWorker,
      queueCounts: this.checkQueues(),
      ffmpegAvailable: tools.ffmpegAvailable,
      ffprobeAvailable: tools.ffprobeAvailable,
      imageProcessorAvailable: tools.imageProcessorAvailable,
      checkedAt: new Date().toISOString(),
      warnings,
      errors,
      metadata: {
        queuePrefix: mediaBackendConfig.mediaQueuePrefix,
        mode: mediaQueueRegistry.getRuntimeMode().mode,
        tools: tools.tools,
      },
    };
  }
}

export const mediaWorkerHealthService = new MediaWorkerHealthService();
