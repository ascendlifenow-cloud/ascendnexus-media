import { productionSecurityPrivacyRecoveryCertificationService, type ProductionSecurityCheck } from "../../server/services/launch/security/ProductionSecurityPrivacyRecoveryCertificationService";

const args = process.argv.slice(2);
const command = args.find((arg) => arg.startsWith("--command="))?.split("=")[1] ?? "certify";

const areaMap: Record<string, string[]> = {
  "authz-certify": ["Authentication", "Authorization"],
  "privacy-certify": ["Log Privacy", "Audit"],
  "observability-certify": ["Observability"],
  "recovery-certify": ["Backup", "Infrastructure Carry-Forward"],
  "media-protection-certify": ["Media Protection"],
  "rate-limit-inventory": ["Rate Limits"],
  "alerts-certify": ["Observability"],
  certify: [],
};

const filterChecks = (checks: ProductionSecurityCheck[]) => {
  const areas = areaMap[command] ?? [];
  return areas.length ? checks.filter((check) => areas.some((area) => check.area === area || check.area.includes(area))) : checks;
};

try {
  const report = await productionSecurityPrivacyRecoveryCertificationService.getReport();
  const docs = await productionSecurityPrivacyRecoveryCertificationService.writeDocumentation(report);
  const checks = filterChecks(report.checks);
  const issues = report.issues.filter((issue) => checks.some((check) => issue.issueId === check.checkId || issue.area === check.area || issue.area.includes(check.area) || issue.area.startsWith("Inherited")));
  const blocked = issues.some((issue) => issue.severity === "P0" || issue.severity === "P1") || (command === "certify" && (report.counts.p0Open > 0 || report.counts.p1Open > 0));
  console.log(JSON.stringify({
    command,
    decision: report.decision,
    finalMessage: report.finalMessage,
    counts: report.counts,
    docs,
    checks,
    issues,
  }, null, 2));
  process.exitCode = blocked ? 1 : 0;
} catch (error) {
  const message = error instanceof Error ? error.message : "Production security certification command failed.";
  console.error(JSON.stringify({ command, error: message }, null, 2));
  process.exitCode = 1;
}
