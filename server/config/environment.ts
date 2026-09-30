export type DeploymentEnvironment = "development" | "test" | "staging" | "production";

const deploymentEnvironments: DeploymentEnvironment[] = ["development", "test", "staging", "production"];

export const isDeploymentEnvironment = (value: string): value is DeploymentEnvironment =>
  deploymentEnvironments.includes(value as DeploymentEnvironment);

export const resolveDeploymentEnvironment = (env: NodeJS.ProcessEnv = process.env): DeploymentEnvironment => {
  const explicit = env.APP_ENV?.trim().toLowerCase();
  if (explicit) {
    if (!isDeploymentEnvironment(explicit)) {
      throw new Error(`Invalid APP_ENV "${explicit}". Expected one of: ${deploymentEnvironments.join(", ")}.`);
    }
    return explicit;
  }
  if (env.NODE_ENV === "test" || env.VITEST || env.JEST_WORKER_ID) return "test";
  if (env.NODE_ENV === "production") return "production";
  return "development";
};

export const getEnvironmentFlags = (environment: DeploymentEnvironment) => ({
  isDevelopment: environment === "development",
  isTest: environment === "test",
  isStaging: environment === "staging",
  isProduction: environment === "production",
});

export const isProductionStrictMode = (environment: DeploymentEnvironment, env: NodeJS.ProcessEnv = process.env): boolean =>
  environment === "production" || env.CONFIG_STRICT_MODE === "true";
