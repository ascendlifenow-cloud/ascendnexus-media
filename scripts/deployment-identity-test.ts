import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
const keys = ["GIT_COMMIT_SHA", "COMMIT_SHA", "RENDER_GIT_COMMIT", "DEPLOYMENT_RELEASE_ID", "RELEASE_ID"] as const;
const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
const { getDeploymentCommitSha, getDeploymentReleaseId } = await import("../server/utils/deployment/deploymentVersionUtils");
const { deploymentReleaseRepository } = await import("../server/repositories/DeploymentRepository");
const { DeploymentReleaseService } = await import("../server/services/deployment/DeploymentReleaseService");
const original = deploymentReleaseRepository.getCurrent;
try {
  for (const key of keys) delete process.env[key];
  assert.equal(getDeploymentCommitSha(), "local-unversioned");
  assert.match(getDeploymentReleaseId(), /^local-/);
  process.env.RENDER_GIT_COMMIT = "a".repeat(40);
  assert.equal(getDeploymentCommitSha(), "a".repeat(40));
  assert.match(getDeploymentReleaseId(), /-aaaaaaaaaaaa$/);
  process.env.COMMIT_SHA = "b".repeat(40);
  assert.equal(getDeploymentCommitSha(), "b".repeat(40));
  process.env.GIT_COMMIT_SHA = "c".repeat(40);
  assert.equal(getDeploymentCommitSha(), "c".repeat(40));
  process.env.DEPLOYMENT_RELEASE_ID = "explicit-release";
  assert.equal(getDeploymentReleaseId(), "explicit-release");
  const service = new DeploymentReleaseService();
  const current = await (async () => {
    deploymentReleaseRepository.getCurrent = async () => null;
    return service.getCurrentRelease();
  })();
  deploymentReleaseRepository.getCurrent = async () => ({ ...current, status: "verified", commitSha: "d".repeat(40) });
  const stale = await service.getCurrentRelease();
  assert.equal(stale.commitSha, "c".repeat(40));
  assert.notEqual(stale.status, "verified");
  deploymentReleaseRepository.getCurrent = async () => ({ ...current, status: "verified" });
  assert.equal((await service.getCurrentRelease()).status, "verified");
  for (const key of keys) delete process.env[key];
  assert.equal((await service.getCurrentRelease()).status, "verified", "Legacy local behavior remains compatible without runtime identity.");
  console.log("Deployment identity tests passed: provider fallback, explicit precedence, stale-record isolation and matching verification. No database writes.");
} finally {
  deploymentReleaseRepository.getCurrent = original;
  for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
}
