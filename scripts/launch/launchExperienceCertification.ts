import { publicMemberExperienceCertificationService } from "../../server/services/launch/experience/PublicMemberExperienceCertificationService";

const commandArg = process.argv.find((arg) => arg.startsWith("--command="));
const command = commandArg?.split("=")[1] ?? "certify";

const output = (payload: unknown) => {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
};

const main = async () => {
  const report = await publicMemberExperienceCertificationService.certify();
  const docs = await publicMemberExperienceCertificationService.writeDocumentation(report);
  const base = {
    command,
    decision: report.health.decision,
    finalMessage: report.health.finalMessage,
    counts: report.health.counts,
    docs,
  };

  if (command === "public-smoke") {
    output({ ...base, publicStatus: report.health.publicStatus, publicRoutes: report.health.publicRoutes, summary: report.health.summary });
  } else if (command === "member-smoke") {
    output({ ...base, memberStatus: report.health.memberStatus, memberRoutes: report.health.memberRoutes, summary: report.health.summary });
  } else if (command === "experience-routes") {
    output({ ...base, routingStatus: report.health.routingStatus, publicRoutes: report.health.publicRoutes, memberRoutes: report.health.memberRoutes });
  } else if (command === "member-access-matrix") {
    output({ ...base, accessStatus: report.health.accessStatus, accessMatrix: report.health.accessMatrix });
  } else if (command === "experience-a11y") {
    output({ ...base, accessibilityStatus: report.health.accessibilityStatus, checks: report.health.checks.filter((check) => check.area === "Accessibility") });
  } else if (command === "experience-performance") {
    output({ ...base, performanceStatus: report.health.performanceStatus, checks: report.health.checks.filter((check) => check.area === "Performance") });
  } else if (command === "browser-health") {
    output({
      ...base,
      browserStatus: report.health.browserStatus,
      consoleStatus: report.health.consoleStatus,
      networkStatus: report.health.networkStatus,
      checks: report.health.checks.filter((check) => check.area === "Browser Evidence"),
    });
  } else {
    output({ ...base, run: report.run, health: report.health });
  }

  if (report.health.counts.p0Open > 0 || report.health.counts.p1Open > 0) process.exitCode = 1;
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
