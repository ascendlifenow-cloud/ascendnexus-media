import { deploymentReleaseRepository } from "../../repositories/DeploymentRepository";
import { getBackendConfig } from "../../config/backendConfig";
import { getClientArtifactDigest, getDeploymentArtifactDigest, getDeploymentCommitSha, getDeploymentEnvironment, getDeploymentReleaseId } from "../../utils/deployment/deploymentVersionUtils";

export class DeploymentReleaseService {
  async getCurrentRelease() {
    const environment = getDeploymentEnvironment();
    const persisted = await deploymentReleaseRepository.getCurrent(environment);
    if (persisted) return persisted;
    const now = new Date().toISOString();
    return {
      deploymentReleaseId: getDeploymentReleaseId(),
      version: getBackendConfig().app.version,
      commitSha: getDeploymentCommitSha(),
      artifactDigest: getDeploymentArtifactDigest(),
      clientArtifactDigest: getClientArtifactDigest(),
      environment,
      status: environment === "production" ? "deployed" : "built",
      requestedBy: "runtime",
      createdAt: now,
      metadata: { source: "runtime_environment" },
      schemaVersion: 1,
    };
  }

  async getPreviousVerifiedRelease() {
    const current = await this.getCurrentRelease();
    return deploymentReleaseRepository.getPreviousVerified(current.environment, current.deploymentReleaseId);
  }

  async listReleases() {
    return deploymentReleaseRepository.list({ includeArchived: true, sort: "createdAt", direction: "desc", limit: 50 });
  }
}

export const deploymentReleaseService = new DeploymentReleaseService();
