const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.length ? rest.join("=") : "true"];
}));

const command = args.get("command") || "health";
const { distributionEngineService } = await import("../server/services/distribution/DistributionEngineService.ts");
const { platformConnectorRegistry } = await import("../server/services/distribution/PlatformConnectorRegistry.ts");
const { distributionQueueService } = await import("../server/services/distribution/DistributionQueueService.ts");
const { platformAnalyticsCollector } = await import("../server/services/distribution/PlatformAnalyticsCollector.ts");
const { distributionAuditService } = await import("../server/services/distribution/DistributionAuditService.ts");

const output = (payload) => console.log(JSON.stringify(payload, null, 2));
const blocks = (payload) => /"status":\s*"failed"|"status":\s*"dead_letter"|"errors":\s*\[[^\]]+"/.test(JSON.stringify(payload));

try {
  let result;
  switch (command) {
    case "health":
    case "verify":
      result = await distributionEngineService.dashboard();
      break;
    case "connectors":
      result = { status: "ok", connectors: await platformConnectorRegistry.health(), checkedAt: new Date().toISOString() };
      break;
    case "queues":
      result = await distributionQueueService.getQueueStatus();
      break;
    case "retry":
      result = await distributionEngineService.retryFailures();
      break;
    case "analytics":
      result = { status: "ok", analytics: await platformAnalyticsCollector.list(), checkedAt: new Date().toISOString() };
      break;
    case "history":
      result = { status: "ok", history: await distributionAuditService.list(), checkedAt: new Date().toISOString() };
      break;
    default:
      throw new Error(`Unknown distribution command: ${command}`);
  }
  output(result);
  if (blocks(result)) process.exitCode = 1;
} catch (error) {
  output({ success: false, command, message: error instanceof Error ? error.message : "Unknown distribution verification error." });
  process.exitCode = 1;
}
