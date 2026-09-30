import type { BackupVerificationRecord } from "../models/deployment/BackupVerificationModel";
import type { DeploymentOperationRecord } from "../models/deployment/DeploymentOperationModel";
import type { DeploymentReleaseRecord } from "../models/deployment/DeploymentReleaseModel";
import type { DeploymentVerificationRecord } from "../models/deployment/DeploymentVerificationModel";
import { BaseRepository } from "./BaseRepository";

export class DeploymentReleaseRepository extends BaseRepository<DeploymentReleaseRecord & Record<string, unknown>> {
  constructor() { super("deploymentReleases", "deploymentReleaseId"); }

  async getCurrent(environment: DeploymentReleaseRecord["environment"]) {
    return (await this.list({ includeArchived: true, sort: "createdAt", direction: "desc" }))
      .find((release) => release.environment === environment && ["deployed", "verifying", "verified"].includes(release.status)) ?? null;
  }

  async getPreviousVerified(environment: DeploymentReleaseRecord["environment"], currentReleaseId?: string) {
    return (await this.list({ includeArchived: true, sort: "verifiedAt", direction: "desc" }))
      .find((release) => release.environment === environment && release.status === "verified" && release.deploymentReleaseId !== currentReleaseId) ?? null;
  }
}

export class DeploymentOperationRepository extends BaseRepository<DeploymentOperationRecord & Record<string, unknown>> {
  constructor() { super("deploymentOperations", "deploymentOperationId"); }
}

export class DeploymentVerificationRepository extends BaseRepository<DeploymentVerificationRecord & Record<string, unknown>> {
  constructor() { super("deploymentVerifications", "deploymentVerificationId"); }
}

export class BackupVerificationRepository extends BaseRepository<BackupVerificationRecord & Record<string, unknown>> {
  constructor() { super("backupVerifications", "backupVerificationId"); }
}

export const deploymentReleaseRepository = new DeploymentReleaseRepository();
export const deploymentOperationRepository = new DeploymentOperationRepository();
export const deploymentVerificationRepository = new DeploymentVerificationRepository();
export const backupVerificationRepository = new BackupVerificationRepository();
