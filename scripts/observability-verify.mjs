const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.length ? rest.join("=") : "true"];
}));

const command = args.get("command") || "health";
const environment = args.get("environment") || process.env.DEPLOYMENT_ENVIRONMENT || process.env.NODE_ENV || "development";
if (environment === "production") {
  process.env.DEPLOYMENT_ENVIRONMENT = "production";
  process.env.NODE_ENV = "production";
}

const { productionHealthCheckRegistry } = await import("../server/services/observability/ProductionHealthCheckRegistry.ts");
const { productionMetricsService } = await import("../server/services/observability/ProductionMetricsService.ts");
const { productionErrorMonitoringService } = await import("../server/services/observability/ProductionErrorMonitoringService.ts");
const { productionTracingService } = await import("../server/services/observability/ProductionTracingService.ts");
const { syntheticMonitoringService } = await import("../server/services/observability/SyntheticMonitoringService.ts");
const { reliabilityReleaseGateService } = await import("../server/services/reliability/ReliabilityReleaseGateService.ts");
const { errorBudgetService } = await import("../server/services/reliability/ErrorBudgetService.ts");
const { serviceLevelObjectiveService } = await import("../server/services/reliability/ServiceLevelObjectiveService.ts");
const { productionConsistencyVerificationService } = await import("../server/services/reliability/ProductionConsistencyVerificationService.ts");
const { queueReconciliationService } = await import("../server/services/reliability/QueueReconciliationService.ts");
const { storageReconciliationService } = await import("../server/services/reliability/StorageReconciliationService.ts");
const { performanceRegressionGateService } = await import("../server/services/reliability/PerformanceRegressionGateService.ts");
const { productionLaunchCertificationService } = await import("../server/services/certification/ProductionLaunchCertificationService.ts");
const { promptCompletionMatrixService } = await import("../server/services/certification/PromptCompletionMatrixService.ts");

const output = (payload) => console.log(JSON.stringify(payload, null, 2));
const blocks = (payload) => /"decision":\s*"blocked"|"decision":\s*"not_certified"|"overallStatus":\s*"unavailable"|"status":\s*"failed"/.test(JSON.stringify(payload));

try {
  let result;
  switch (command) {
    case "health":
    case "verify":
    case "logs-check":
    case "alerts-test":
      result = await productionHealthCheckRegistry.runAllChecks();
      break;
    case "metrics-check":
      productionMetricsService.counter("anm_synthetic_checks_total", 1, { service: "observability", environment, result: "started" });
      result = productionMetricsService.getHealth();
      break;
    case "errors-check":
      result = productionErrorMonitoringService.getHealth();
      break;
    case "tracing-check":
      result = productionTracingService.getHealth();
      break;
    case "synthetics":
      result = await syntheticMonitoringService.runSuite(environment);
      break;
    case "reliability-health":
      result = await reliabilityReleaseGateService.evaluate(environment);
      break;
    case "slo-report":
      result = { status: "insufficient_data", slos: await serviceLevelObjectiveService.ensureDefaults(), checkedAt: new Date().toISOString() };
      break;
    case "error-budget":
      result = await errorBudgetService.buildErrorBudgetReport();
      break;
    case "consistency-check":
      result = await productionConsistencyVerificationService.buildConsistencyReport();
      break;
    case "queue-reconcile":
      result = await queueReconciliationService.reconcile();
      break;
    case "storage-reconcile":
      result = await storageReconciliationService.reconcile();
      break;
    case "fault-test":
      result = { status: "skipped", reason: "Fault injection is staging-only and requires explicit operator approval.", scenario: args.get("scenario") ?? "unspecified", environment, checkedAt: new Date().toISOString() };
      break;
    case "performance-baseline":
      result = { status: "warning", scenario: args.get("scenario") ?? "public-api", tool: "local-baseline-placeholder", warnings: ["No live staging baseline was measured in this workspace."], checkedAt: new Date().toISOString() };
      break;
    case "performance-load-test":
      result = { status: "skipped", reason: "Load testing requires an approved staging target and explicit operator authorization.", scenario: args.get("scenario") ?? "unspecified", target: args.get("target") ?? "unset", checkedAt: new Date().toISOString() };
      break;
    case "performance-compare":
      result = await performanceRegressionGateService.buildDecision(args.get("scenario") ?? "public-api");
      break;
    case "launch-certification":
      result = await productionLaunchCertificationService.buildCertificationDecision(environment);
      break;
    case "completion-matrix":
      result = { status: "generated", matrix: promptCompletionMatrixService.buildMatrix(), checkedAt: new Date().toISOString() };
      break;
    default:
      throw new Error(`Unknown observability command: ${command}`);
  }
  output(result);
  if (blocks(result)) process.exitCode = 1;
} catch (error) {
  output({ success: false, command, message: error instanceof Error ? error.message : "Unknown observability verification error." });
  process.exitCode = 1;
}
