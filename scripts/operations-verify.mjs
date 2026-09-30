const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.length ? rest.join("=") : "true"];
}));

const command = args.get("command") || "health";
const { operationsDashboardService } = await import("../server/services/operations/OperationsDashboardService.ts");
const { publishingCalendarService } = await import("../server/services/operations/PublishingCalendarService.ts");
const { releaseWorkflowService } = await import("../server/services/operations/ReleaseWorkflowService.ts");
const { releaseVerificationService } = await import("../server/services/operations/ReleaseVerificationService.ts");
const { optimizationRecommendationService } = await import("../server/services/operations/OptimizationRecommendationService.ts");
const { contentHealthService } = await import("../server/services/operations/ContentHealthService.ts");
const { operationalReportingService } = await import("../server/services/operations/OperationalReportingService.ts");
const { operationalMetricsService } = await import("../server/services/operations/OperationalMetricsService.ts");
const { contentLifecycleService } = await import("../server/services/operations/ContentLifecycleService.ts");
const { growthAnalyticsService } = await import("../server/services/operations/GrowthAnalyticsService.ts");

const output = (payload) => console.log(JSON.stringify(payload, null, 2));
const isBlocking = (payload) => {
  const body = JSON.stringify(payload);
  return /"status":\s*"critical"|"status":\s*"failed"|"overallStatus":\s*"unavailable"/.test(body);
};

try {
  let result;
  switch (command) {
    case "health":
    case "verify":
      result = await operationsDashboardService.buildOverview();
      break;
    case "calendar":
      result = { status: "ok", events: await publishingCalendarService.listEvents(), checkedAt: new Date().toISOString() };
      break;
    case "workflow-check":
      result = { status: "ok", workflows: await releaseWorkflowService.listWorkflows(), checkedAt: new Date().toISOString() };
      break;
    case "verification":
      result = await releaseVerificationService.verify({ entityType: args.get("entityType") ?? "site", entityId: args.get("entityId") ?? "" }, "operations_cli");
      break;
    case "recommendations":
      result = await optimizationRecommendationService.generateRecommendations();
      break;
    case "content-health":
      result = await contentHealthService.buildHealth();
      break;
    case "report":
      result = await operationalReportingService.generateReport({ reportType: args.get("period") ?? "daily" }, "operations_cli");
      break;
    case "metrics":
      result = await operationalMetricsService.buildSnapshot(args.get("period") ?? "daily");
      break;
    case "lifecycle":
      result = await contentLifecycleService.reconcileLifecycle();
      break;
    case "growth":
      result = await growthAnalyticsService.buildGrowthSummary();
      break;
    default:
      throw new Error(`Unknown operations command: ${command}`);
  }
  output(result);
  if (isBlocking(result)) process.exitCode = 1;
} catch (error) {
  output({ success: false, command, message: error instanceof Error ? error.message : "Unknown operations verification error." });
  process.exitCode = 1;
}
