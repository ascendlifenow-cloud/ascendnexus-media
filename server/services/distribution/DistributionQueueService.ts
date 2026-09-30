import { distributionJobRepository, mediaTransformationRepository, platformUploadRepository } from "../../repositories/operations/OperationsRepository";
import type { DistributionQueueName } from "../../models/operations/OperationsModels";
import { nowIso } from "./distributionShared";

const queues: DistributionQueueName[] = ["media_transformation", "platform_upload", "verification", "retry", "analytics_sync", "cleanup"];

export class DistributionQueueService {
  async getQueueStatus() {
    const [jobs, transforms, uploads] = await Promise.all([
      distributionJobRepository.list({ includeArchived: true }),
      mediaTransformationRepository.list({ includeArchived: true }),
      platformUploadRepository.list({ includeArchived: true }),
    ]);
    return {
      queues: queues.map((queueName) => ({
        queueName,
        queued: jobs.filter((job) => job.queueName === queueName && job.status === "queued").length,
        running: jobs.filter((job) => job.queueName === queueName && job.status === "running").length,
        failed: jobs.filter((job) => job.queueName === queueName && job.status === "failed").length,
        retrying: jobs.filter((job) => job.queueName === queueName && job.status === "retrying").length,
        deadLetter: jobs.filter((job) => job.queueName === queueName && job.status === "dead_letter").length,
      })),
      transformations: {
        queued: transforms.filter((item) => item.status === "queued").length,
        failed: transforms.filter((item) => item.status === "failed").length,
        completed: transforms.filter((item) => item.status === "completed").length,
      },
      uploads: {
        queued: uploads.filter((item) => item.status === "queued").length,
        failed: uploads.filter((item) => item.status === "failed").length,
        verified: uploads.filter((item) => item.status === "verified").length,
      },
      checkedAt: nowIso(),
    };
  }
}

export const distributionQueueService = new DistributionQueueService();
