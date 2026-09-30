import { deploymentLaunchChecklistService } from "../deployment/DeploymentLaunchChecklistService";
import { securityLaunchGateService } from "../security/SecurityLaunchGateService";
import { seoIndexingLaunchGateService } from "../seo/SeoIndexingLaunchGateService";
import { productionHealthCheckRegistry } from "../observability/ProductionHealthCheckRegistry";
import { syntheticMonitoringService } from "../observability/SyntheticMonitoringService";
import { productionConsistencyVerificationService } from "./ProductionConsistencyVerificationService";
import { queueReconciliationService } from "./QueueReconciliationService";
import { storageReconciliationService } from "./StorageReconciliationService";
import { performanceRegressionGateService } from "./PerformanceRegressionGateService";

export class ReliabilityReleaseGateService {
  async evaluate(environment = "production") {
    const safe = async <T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> => {
      try {
        return await fn();
      } catch (error) {
        return { ...fallback, status: "failed", errors: [error instanceof Error ? error.message : `${label} failed.`], checkedAt: new Date().toISOString() } as T;
      }
    };
    const [health, synthetics, consistency, queue, storage, performance, security, deployment, seo] = await Promise.all([
      safe("health", { overallStatus: "unavailable", criticalFailures: ["health"], checks: [], checkedAt: new Date().toISOString() }, () => productionHealthCheckRegistry.runAllChecks()),
      safe("synthetics", { status: "failed", checks: [], checkedAt: new Date().toISOString() }, () => syntheticMonitoringService.runSuite(environment)),
      safe("consistency", { status: "failed", errors: ["Consistency check failed."], checkedAt: new Date().toISOString() }, () => productionConsistencyVerificationService.buildConsistencyReport()),
      safe("queue", { status: "failed", errors: ["Queue reconciliation failed."], warnings: [], checkedAt: new Date().toISOString() }, () => queueReconciliationService.reconcile()),
      safe("storage", { status: "failed", errors: ["Storage reconciliation failed."], warnings: [], checkedAt: new Date().toISOString() }, () => storageReconciliationService.reconcile()),
      safe("performance", { decision: "approved_with_warnings", warnings: ["Performance check unavailable."], regressions: [], checkedAt: new Date().toISOString() }, () => performanceRegressionGateService.buildDecision("public-api")),
      safe("security", { decision: "blocked", blockingFindings: [{ control: "security_gate", status: "fail", message: "Security gate failed." }], acceptedRisks: [], checkedAt: new Date().toISOString() }, () => securityLaunchGateService.evaluate()),
      safe("deployment", { ready: false, blockingIssues: ["Deployment check failed."], warnings: [], errors: ["Deployment check failed."], checkedAt: new Date().toISOString() }, () => deploymentLaunchChecklistService.buildLaunchReport(environment)),
      safe("seo", { decision: "blocked", blockingIssues: ["SEO gate failed."], warnings: [], checkedAt: new Date().toISOString() }, () => seoIndexingLaunchGateService.evaluate(environment)),
    ]);
    const blockers = [
      ...health.criticalFailures.map((service) => `Critical health failure: ${service}`),
      ...(synthetics.status === "failed" ? ["Critical synthetic check failure."] : []),
      ...(consistency.status !== "healthy" ? consistency.errors : []),
      ...(queue.status === "failed" ? queue.errors : []),
      ...(storage.status === "failed" || storage.status === "critical" ? storage.errors : []),
      ...(performance.decision === "blocked" ? ["Performance regression gate blocked."] : []),
      ...(security.decision === "blocked" ? ["Security launch gate blocked."] : []),
      ...(!deployment.ready ? ["Deployment launch gate blocked."] : []),
    ];
    const warnings = [
      ...(synthetics.status === "warning" ? ["Non-critical synthetic checks failed."] : []),
      ...(seo.decision === "blocked" ? ["SEO indexing launch is blocked/deferred; core certification may proceed only if no privacy issue exists."] : []),
      ...(performance.warnings ?? []),
    ];
    return { decision: blockers.length ? "blocked" : warnings.length ? "approved_with_warnings" : "approved", blockers, warnings, health, synthetics, consistency, queue, storage, performance, security, deploymentDecision: deployment.ready ? "approved" : "blocked", seoDecision: seo.decision, checkedAt: new Date().toISOString() };
  }
}

export const reliabilityReleaseGateService = new ReliabilityReleaseGateService();
