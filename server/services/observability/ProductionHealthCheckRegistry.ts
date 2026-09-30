import { getBackendConfig } from "../../config/backendConfig";
import { getConfigurationValidationResult } from "../../config/configValidation";
import { databaseHealthService } from "../../database/DatabaseHealthService";
import { deploymentHealthService } from "../deployment/DeploymentHealthService";
import { mediaWorkerHealthService } from "../media/MediaWorkerHealthService";
import { productionStorageHealthService } from "../media/ProductionStorageHealthService";
import { mediaPublicationOrchestrationService } from "../publication/MediaPublicationOrchestrationService";
import { publicContentDeliveryService } from "../public/PublicContentDeliveryService";
import { productionSecurityHealthService } from "../security/ProductionSecurityHealthService";
import { productionSeoHealthService } from "../seo/ProductionSeoHealthService";
import { productionErrorMonitoringService } from "./ProductionErrorMonitoringService";
import { productionMetricsService } from "./ProductionMetricsService";
import { productionTracingService } from "./ProductionTracingService";

export type ServiceHealthStatus = "healthy" | "degraded" | "unavailable" | "disabled" | "unknown";

export interface ServiceHealthCheckResult {
  service: string;
  status: ServiceHealthStatus;
  critical: boolean;
  latencyMs?: number;
  checkedAt: string;
  version?: string;
  warnings: string[];
  errors: string[];
  safeDetails?: Record<string, unknown>;
  dependencies?: string[];
}

const timed = async (service: string, critical: boolean, fn: () => Promise<Omit<ServiceHealthCheckResult, "service" | "critical" | "latencyMs" | "checkedAt">>): Promise<ServiceHealthCheckResult> => {
  const started = Date.now();
  try {
    const result = await fn();
    return { service, critical, latencyMs: Date.now() - started, checkedAt: new Date().toISOString(), ...result };
  } catch (error) {
    return { service, critical, status: critical ? "unavailable" : "degraded", latencyMs: Date.now() - started, checkedAt: new Date().toISOString(), warnings: [], errors: [error instanceof Error ? error.message : "Health check failed."] };
  }
};

export class ProductionHealthCheckRegistry {
  async runAllChecks() {
    const config = getBackendConfig();
    const checks = await Promise.all([
      timed("configuration", true, async () => {
        const validation = getConfigurationValidationResult(config);
        return { status: validation.valid ? "healthy" : "unavailable", version: config.app.version, warnings: validation.warnings.map((item) => item.code), errors: validation.errors.map((item) => item.code) };
      }),
      timed("api", true, async () => ({ status: "healthy", version: config.app.version, warnings: [], errors: [], safeDetails: { live: true } })),
      timed("database", true, async () => {
        const health = await databaseHealthService.getHealth();
        return { status: health.status === "healthy" ? "healthy" : "degraded", warnings: [], errors: health.status === "failed" ? ["Database health failed."] : [], safeDetails: { status: health.status } };
      }),
      timed("redis", config.app.isProduction, async () => ({ status: config.redis.url ? "healthy" : config.app.isProduction ? "unavailable" : "disabled", warnings: config.redis.url ? [] : ["Redis is not configured in this environment."], errors: config.app.isProduction && !config.redis.url ? ["Redis required for production queues."] : [] })),
      timed("workers", config.app.isProduction, async () => {
        const health = await mediaWorkerHealthService.getFullHealthReport();
        return { status: health.errors.length ? "unavailable" : health.warnings.length ? "degraded" : "healthy", warnings: health.warnings, errors: health.errors, safeDetails: { workersEnabled: health.workersEnabled, redisConnected: health.redisConnected } };
      }),
      timed("storage", true, async () => {
        const health = await productionStorageHealthService.getFullHealthReport();
        return { status: health.status === "healthy" ? "healthy" : health.status === "critical" ? "unavailable" : "degraded", warnings: health.warnings, errors: health.errors, safeDetails: { provider: health.provider, status: health.status } };
      }),
      timed("publication", true, async () => {
        const health = await mediaPublicationOrchestrationService.getPublicationHealth();
        return { status: health.status === "healthy" ? "healthy" : "degraded", warnings: health.warnings ?? [], errors: health.errors ?? [], safeDetails: { status: health.status } };
      }),
      timed("public_api", true, async () => {
        const health = await publicContentDeliveryService.buildPublicDeliveryHealth();
        return { status: health.status === "ok" ? "healthy" : "degraded", warnings: health.publicContentAvailable ? [] : ["No public content available."], errors: [], safeDetails: { publishedArtistCount: health.publishedArtistCount, publishedReleaseCount: health.publishedReleaseCount } };
      }),
      timed("security_gate", true, async () => {
        const health = await productionSecurityHealthService.getHealthReport();
        return { status: health.criticalFindings ? "unavailable" : health.mediumFindings ? "degraded" : "healthy", warnings: health.warnings, errors: health.errors };
      }),
      timed("deployment_gate", true, async () => {
        const health = await deploymentHealthService.getHealth();
        return { status: health.ready ? "healthy" : "unavailable", warnings: health.warnings, errors: health.errors, safeDetails: { ready: health.ready } };
      }),
      timed("seo_gate", false, async () => {
        const health = await productionSeoHealthService.buildHealth(config.app.environment);
        return { status: health.overallStatus === "healthy" ? "healthy" : health.overallStatus === "warning" ? "degraded" : "degraded", warnings: health.warnings, errors: health.blockingIssues };
      }),
      timed("metrics", false, async () => productionMetricsService.getHealth() as never),
      timed("error_monitoring", false, async () => productionErrorMonitoringService.getHealth() as never),
      timed("tracing", false, async () => productionTracingService.getHealth() as never),
    ]);
    const criticalFailures = checks.filter((check) => check.critical && ["unavailable", "unknown"].includes(check.status));
    return {
      overallStatus: criticalFailures.length ? "unavailable" : checks.some((check) => check.status === "degraded") ? "degraded" : "healthy",
      checks,
      criticalFailures: criticalFailures.map((check) => check.service),
      checkedAt: new Date().toISOString(),
    };
  }
}

export const productionHealthCheckRegistry = new ProductionHealthCheckRegistry();
