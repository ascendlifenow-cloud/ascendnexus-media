import { adminOperationsCertificationService } from "../../server/services/launch/admin/AdminOperationsCertificationService";

const commandArg = process.argv.find((arg) => arg.startsWith("--command="));
const command = commandArg?.split("=")[1] ?? "certify";

const output = (payload: unknown) => {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
};

const byArea = (report: Awaited<ReturnType<typeof adminOperationsCertificationService.getReport>>, areas: string[]) =>
  report.checks.filter((check) => areas.includes(check.area));

const main = async () => {
  const report = await adminOperationsCertificationService.getReport();
  const docs = await adminOperationsCertificationService.writeDocumentation(report);
  const base = {
    command,
    decision: report.decision,
    finalMessage: report.finalMessage,
    counts: report.counts,
    docs,
  };

  if (command === "admin-smoke") {
    output({ ...base, summary: report.summary, routeInventory: report.routeInventory, checks: byArea(report, ["Admin Authentication", "Admin Routing", "Navigation", "Dashboard"]) });
  } else if (command === "artist-crud") {
    output({ ...base, checks: byArea(report, ["Artist Operations", "Media Operations"]) });
  } else if (command === "release-crud") {
    output({ ...base, checks: byArea(report, ["Release Operations", "Publication"]) });
  } else if (command === "media-operations") {
    output({ ...base, checks: byArea(report, ["Media Operations", "Media Intake", "Media Review", "Media Processing"]) });
  } else if (command === "admin-publication") {
    output({ ...base, checks: byArea(report, ["Publication", "Release Operations"]) });
  } else if (command === "admin-export-import") {
    output({ ...base, checks: byArea(report, ["Export Import"]) });
  } else if (command === "admin-permissions") {
    output({ ...base, checks: byArea(report, ["Permissions"]) });
  } else if (command === "admin-a11y") {
    output({ ...base, checks: byArea(report, ["Accessibility"]) });
  } else if (command === "admin-browser-health") {
    output({ ...base, checks: byArea(report, ["Browser Evidence"]) });
  } else {
    output({ ...base, report });
  }

  if (report.counts.p0Open > 0 || report.counts.p1Open > 0) process.exitCode = 1;
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
