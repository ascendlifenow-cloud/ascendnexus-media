import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getBackendConfig } from "../../config/backendConfig";

export const getDeploymentEnvironment = () => {
  const env = getBackendConfig().app.environment;
  if (env === "development") return "local";
  if (env === "production" || env === "staging" || env === "test") return env;
  return "local";
};

export const getDeploymentReleaseId = () => process.env.DEPLOYMENT_RELEASE_ID || process.env.RELEASE_ID || `local-${getBackendConfig().app.version}`;
export const getDeploymentCommitSha = () => process.env.GIT_COMMIT_SHA || process.env.COMMIT_SHA || "local-unversioned";
export const getDeploymentArtifactDigest = () => process.env.ARTIFACT_DIGEST || process.env.DEPLOYMENT_ARTIFACT_DIGEST || "local-unverified";

export const hashFileIfPresent = (filePath: string) => {
  if (!fs.existsSync(filePath)) return null;
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
};

export const getClientArtifactDigest = () => hashFileIfPresent(path.join(process.cwd(), "dist", "index.html"));
