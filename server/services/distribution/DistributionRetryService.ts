import { distributionJobRepository, platformUploadRepository } from "../../repositories/operations/OperationsRepository";
import { platformConnectorRegistry } from "./PlatformConnectorRegistry";
import { nowIso } from "./distributionShared";

const nonRetryable = ["permission denied", "invalid metadata", "missing media", "deleted release", "revoked credentials"];

export class DistributionRetryService {
  isRetryable(reason = "") {
    const normalized = reason.toLowerCase();
    return !nonRetryable.some((item) => normalized.includes(item));
  }

  async retryFailedUploads() {
    const uploads = (await platformUploadRepository.list({ includeArchived: true })).filter((upload) => ["failed", "retrying"].includes(upload.status) && upload.retryable);
    const retried = [];
    for (const upload of uploads) {
      const connector = platformConnectorRegistry.getConnector(upload.platform);
      const result = await connector.retry({ platformId: upload.platformId, uploadId: upload.uploadId });
      const next = await platformUploadRepository.update(upload.uploadId, {
        status: result.ok ? "uploaded" : "failed",
        attemptCount: upload.attemptCount + 1,
        lastAttemptAt: nowIso(),
        retryable: result.ok ? false : this.isRetryable(result.message),
        failureReason: result.ok ? undefined : result.message,
      });
      if (next) retried.push(next);
    }
    const deadLetter = retried.filter((upload) => upload.status === "failed" && !upload.retryable);
    for (const upload of deadLetter) await distributionJobRepository.update(upload.distributionJobId, { status: "dead_letter", failureReason: upload.failureReason });
    return { retried, deadLetter, checkedAt: nowIso() };
  }
}

export const distributionRetryService = new DistributionRetryService();
