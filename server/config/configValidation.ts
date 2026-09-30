import { ConfigurationError, type ConfigurationIssue, type ConfigurationValidationResult } from "./configTypes";
import { getBackendConfig, type BackendConfig } from "./backendConfig";

export const getConfigurationValidationResult = (config: BackendConfig = getBackendConfig()): ConfigurationValidationResult => {
  const errors = config.issues.filter((issue) => issue.severity === "error");
  const warnings = config.issues.filter((issue) => issue.severity === "warning");
  const info = config.issues.filter((issue) => issue.severity === "info");
  return {
    valid: errors.length === 0,
    environment: config.app.environment,
    errors,
    warnings,
    info,
    checkedAt: new Date().toISOString(),
    metadata: {
      strictMode: config.app.strictMode,
      issueCount: config.issues.length,
    },
  };
};

export const validateNoProductionMocks = (config: BackendConfig = getBackendConfig()): ConfigurationIssue[] =>
  config.issues.filter((issue) => [
    "PRODUCTION_MOCK_STORAGE_FORBIDDEN",
    "PUBLIC_SEED_FALLBACK_FORBIDDEN",
    "AUTH_BYPASS_FORBIDDEN",
    "DEV_ADMIN_TOKEN_FORBIDDEN",
    "WORKERS_DISABLED_FORBIDDEN",
  ].includes(issue.code));

export const validateBackendConfigAtStartup = (config: BackendConfig = getBackendConfig()): ConfigurationValidationResult => {
  const result = getConfigurationValidationResult(config);
  if (config.app.isProduction && !result.valid) {
    throw new ConfigurationError({
      code: "CONFIGURATION_STARTUP_FAILED",
      message: "Production configuration validation failed.",
      issues: result.errors,
      environment: config.app.environment,
    });
  }
  return result;
};

export const validateWorkerConfigAtStartup = validateBackendConfigAtStartup;
