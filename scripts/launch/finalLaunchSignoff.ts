import { finalLaunchSignoffService } from "../../server/services/launch/final/FinalLaunchSignoffService";

try {
  const report = await finalLaunchSignoffService.getReport();
  const docs = await finalLaunchSignoffService.writeDocumentation(report);
  console.log(JSON.stringify({
    decision: report.decision,
    finalMessage: report.finalMessage,
    counts: report.counts,
    releaseCandidate: report.releaseCandidate,
    docs,
    failedChecks: report.checks.filter((check) => check.status === "fail").map((check) => ({ checkId: check.checkId, area: check.area, summary: check.summary })),
    blockers: report.blockerRegistry.map((blocker) => ({ issueId: blocker.issueId, sourcePrompt: blocker.sourcePrompt, severity: blocker.severity, area: blocker.area, description: blocker.description })),
  }, null, 2));
  process.exitCode = report.decision === "GO" ? 0 : 1;
} catch (error) {
  const message = error instanceof Error ? error.message : "Final launch signoff failed.";
  console.error(JSON.stringify({ decision: "NO-GO", error: message }, null, 2));
  process.exitCode = 1;
}
