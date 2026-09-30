import { deploymentOperationRepository } from "../../repositories/DeploymentRepository";
import { deploymentReleaseService } from "./DeploymentReleaseService";

export class DeploymentRollbackService {
  async getCurrentRelease() {
    return deploymentReleaseService.getCurrentRelease();
  }

  async getPreviousVerifiedRelease() {
    return deploymentReleaseService.getPreviousVerifiedRelease();
  }

  async evaluateRollbackCompatibility(targetReleaseId?: string) {
    const current = await this.getCurrentRelease();
    const previous = await this.getPreviousVerifiedRelease();
    const target = targetReleaseId ? (await deploymentReleaseService.listReleases()).find((release) => release.deploymentReleaseId === targetReleaseId) ?? null : previous;
    const blockingIssues = [];
    if (!target) blockingIssues.push("No previous verified release is available.");
    if (target && current.migrationVersion && target.migrationVersion && current.migrationVersion !== target.migrationVersion) {
      blockingIssues.push("Migration version differs; rollback requires an explicit database compatibility plan.");
    }
    return { compatible: blockingIssues.length === 0, current, target, blockingIssues, checkedAt: new Date().toISOString() };
  }

  async requestRollback(targetReleaseId: string, actorId: string, reason: string) {
    const compatibility = await this.evaluateRollbackCompatibility(targetReleaseId);
    if (!compatibility.compatible) {
      const error = new Error("Rollback is not compatible.");
      Object.assign(error, { statusCode: 409, code: "DEPLOYMENT_ROLLBACK_UNAVAILABLE", safeDetails: { blockingIssues: compatibility.blockingIssues } });
      throw error;
    }
    const now = new Date().toISOString();
    return deploymentOperationRepository.create({
      deploymentOperationId: `rollback-${Date.now()}`,
      operationType: "rollback",
      environment: compatibility.current.environment,
      status: "requested",
      releaseId: compatibility.current.deploymentReleaseId,
      targetReleaseId,
      requestedBy: actorId,
      reason,
      createdAt: now,
      updatedAt: now,
      metadata: { execution: "ci_cd_required" },
      schemaVersion: 1,
    });
  }

  async getRollbackHistory() {
    return (await deploymentOperationRepository.list({ includeArchived: true, sort: "createdAt", direction: "desc", limit: 25 })).filter((operation) => operation.operationType === "rollback");
  }
}

export const deploymentRollbackService = new DeploymentRollbackService();
