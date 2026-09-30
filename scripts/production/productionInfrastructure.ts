import { productionInfrastructureCertificationService, type ProductionInfrastructureCheck } from "../../server/services/launch/infrastructure/ProductionInfrastructureCertificationService";

const args = process.argv.slice(2);
const command = args.find((arg) => arg.startsWith("--command="))?.split("=")[1] ?? "certify";
const json = args.includes("--json") || true;

const areaMap: Record<string, string[]> = {
  "env-verify": ["Environment"],
  "secrets-scan": ["Secrets"],
  "db-health": ["Database", "Migrations"],
  "redis-health": ["Redis"],
  "queue-health": ["Queues"],
  "worker-health": ["Workers"],
  "storage-health": ["Storage"],
  "cdn-health": ["CDN"],
  "email-health": ["Email"],
  "dns-verify": ["DNS"],
  "tls-verify": ["TLS"],
  migrate: ["Migrations"],
  backup: ["Backup"],
  "restore-test": ["Backup"],
  "infra-smoke": ["Environment", "Database", "Redis", "Queues", "Workers", "Storage", "CDN", "Email", "DNS", "TLS", "Deployment", "Backup", "Rollback", "Cutover"],
  deploy: ["Deployment"],
  rollback: ["Rollback"],
  certify: [],
};

const mutationCommands = new Set(["migrate", "backup", "restore-test", "deploy", "rollback"]);

const filterChecks = (checks: ProductionInfrastructureCheck[]) => {
  const areas = areaMap[command] ?? [];
  return areas.length ? checks.filter((check) => areas.includes(check.area)) : checks;
};

try {
  const report = await productionInfrastructureCertificationService.getReport();
  const docs = await productionInfrastructureCertificationService.writeDocumentation(report);
  const checks = filterChecks(report.checks);
  const issues = report.issues.filter((issue) => checks.some((check) => check.checkId === issue.issueId));
  const blocked = issues.some((issue) => issue.severity === "P0" || issue.severity === "P1") || (command === "certify" && (report.counts.p0Open > 0 || report.counts.p1Open > 0));
  const mutationSafe = !mutationCommands.has(command) || process.env.APP_ENV === "production" && process.env.PRODUCTION_OPERATION_CONFIRM === "true";
  const payload = {
    command,
    decision: report.decision,
    finalMessage: mutationSafe ? report.finalMessage : "Production mutation command is present but refused without APP_ENV=production and PRODUCTION_OPERATION_CONFIRM=true.",
    counts: report.counts,
    docs,
    checks,
    issues,
  };
  console.log(json ? JSON.stringify(payload, null, 2) : `${command}: ${payload.decision}`);
  process.exitCode = blocked || !mutationSafe ? 1 : 0;
} catch (error) {
  const message = error instanceof Error ? error.message : "Production infrastructure command failed.";
  console.error(JSON.stringify({ command, error: message }, null, 2));
  process.exitCode = 1;
}
