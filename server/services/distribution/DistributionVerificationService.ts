import { platformUploadRepository } from "../../repositories/operations/OperationsRepository";
import { platformConnectorRegistry } from "./PlatformConnectorRegistry";
import { nowIso } from "./distributionShared";

export class DistributionVerificationService {
  async verifyUpload(uploadId: string) {
    const upload = await platformUploadRepository.get(uploadId);
    if (!upload) throw new Error("Platform upload not found.");
    const connector = platformConnectorRegistry.getConnector(upload.platform);
    const verification = await connector.verify(upload.platformId);
    const updated = await platformUploadRepository.update(uploadId, {
      status: verification.ok ? "verified" : "failed",
      verifiedAt: verification.ok ? nowIso() : upload.verifiedAt,
      failureReason: verification.ok ? undefined : verification.message,
      retryable: false,
    });
    return { upload: updated, verification };
  }

  async verifyJob(distributionJobId: string) {
    const uploads = (await platformUploadRepository.list({ includeArchived: true })).filter((upload) => upload.distributionJobId === distributionJobId);
    const results = [];
    for (const upload of uploads) results.push(await this.verifyUpload(upload.uploadId));
    const failed = results.filter((result) => !result.verification.ok);
    return { status: failed.length ? "failed" : "passed", results, checkedAt: nowIso() };
  }
}

export const distributionVerificationService = new DistributionVerificationService();
