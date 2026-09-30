import { getBackendConfig } from "../../config/backendConfig";
import { getConfigurationValidationResult } from "../../config/configValidation";
import { databaseConnectionService } from "../../database/DatabaseConnectionService";
import { productionSecurityHealthService } from "../security/ProductionSecurityHealthService";
import { deploymentReleaseService } from "./DeploymentReleaseService";

export class DeploymentHealthService {
  async getHealth() {
    const config = getBackendConfig();
    const validation = getConfigurationValidationResult(config);
    const release = await deploymentReleaseService.getCurrentRelease();
    const security = await productionSecurityHealthService.getHealthReport();
    const databaseConfigured = Boolean(config.database.uri);
    const databaseConnected = databaseConnectionService.isConfigured() ? databaseConnectionService.isConnected() : !config.app.isProduction && !config.app.isStaging;
    const redisConfigured = Boolean(config.redis.url);
    const workerReady = !config.app.isProduction || (config.processing.workersEnabled && redisConfigured);
    const ready = validation.valid && databaseConnected && workerReady && security.criticalFindings === 0;
    return {
      service: config.app.serviceName,
      environment: config.app.environment,
      release,
      ready,
      live: true,
      checks: {
        configuration: validation.valid ? "pass" : "fail",
        database: databaseConnected ? "pass" : databaseConfigured ? "degraded" : "fail",
        redis: redisConfigured ? "configured" : "missing",
        workers: workerReady ? "pass" : "fail",
        storage: config.storage.provider,
        cdn: config.cdn.enabled ? "enabled" : "disabled",
        security: security.criticalFindings === 0 ? "pass" : "fail",
      },
      warnings: validation.warnings.map((issue) => issue.code),
      errors: validation.errors.map((issue) => issue.code),
      checkedAt: new Date().toISOString(),
    };
  }
}

export const deploymentHealthService = new DeploymentHealthService();
