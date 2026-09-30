import type { MediaProcessingJob } from "../models/mediaModels";
import { getQueueNameForJobType, mediaQueueConfig, mediaQueueNames, type MediaQueueName } from "./mediaQueueConfig";
import { getBackendConfig } from "../config/backendConfig";

export interface MediaQueueHealth {
  queueName: MediaQueueName;
  paused: boolean;
  queued: number;
  active: number;
  completed: number;
  failed: number;
  deadLetter: number;
}

export class MediaQueueRegistry {
  private initialized = false;
  private readonly queues = new Map<MediaQueueName, MediaProcessingJob[]>();
  private readonly pausedQueues = new Set<MediaQueueName>();

  initialize(): void {
    const backendConfig = getBackendConfig();
    if ((backendConfig.app.isProduction || backendConfig.app.isStaging) && !mediaQueueConfig.redisUrl) {
      throw new Error("PROCESSING_REDIS_UNAVAILABLE: staging and production processing queues require Redis.");
    }
    Object.values(mediaQueueNames).forEach((queueName) => {
      if (!this.queues.has(queueName)) this.queues.set(queueName, []);
    });
    this.initialized = true;
  }

  getQueue(queueName: MediaQueueName): MediaProcessingJob[] {
    if (!this.initialized) this.initialize();
    return this.queues.get(queueName) ?? [];
  }

  getQueueForJobType(jobType: MediaProcessingJob["jobType"]): MediaQueueName {
    return getQueueNameForJobType(jobType);
  }

  enqueueJob(processingJob: MediaProcessingJob): MediaProcessingJob {
    const queueName = this.getQueueForJobType(processingJob.jobType);
    this.getQueue(queueName).push({ ...processingJob, queueName });
    return { ...processingJob, queueName };
  }

  pauseQueue(queueName: MediaQueueName): void {
    this.pausedQueues.add(queueName);
  }

  resumeQueue(queueName: MediaQueueName): void {
    this.pausedQueues.delete(queueName);
  }

  isPaused(queueName: MediaQueueName): boolean {
    return this.pausedQueues.has(queueName);
  }

  getQueueHealth(): MediaQueueHealth[] {
    if (!this.initialized) this.initialize();
    return [...this.queues.entries()].map(([queueName, jobs]) => ({
      queueName,
      paused: this.pausedQueues.has(queueName),
      queued: jobs.filter((job) => job.status === "queued" || job.status === "delayed").length,
      active: jobs.filter((job) => job.status === "active" || job.status === "processing").length,
      completed: jobs.filter((job) => job.status === "completed" || job.status === "skipped").length,
      failed: jobs.filter((job) => job.status === "failed" || job.status === "retrying").length,
      deadLetter: jobs.filter((job) => job.status === "dead_letter").length,
    }));
  }

  shutdown(): void {
    this.initialized = false;
  }

  getRuntimeMode() {
    return {
      redisConfigured: Boolean(mediaQueueConfig.redisUrl),
      workersEnabled: mediaQueueConfig.workersEnabled,
      queuePrefix: mediaQueueConfig.prefix,
      mode: mediaQueueConfig.redisUrl ? "redis_ready" : "in_process_fallback",
    };
  }
}

export const mediaQueueRegistry = new MediaQueueRegistry();
