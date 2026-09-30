import { productionLaunchBlockerService, type LaunchBlockerSeverity } from "../../server/services/launch/ProductionLaunchBlockerService";

const commandArg = process.argv.find((arg) => arg.startsWith("--command="));
const command = commandArg?.split("=")[1] ?? "smoke";

const commandAreas: Record<string, string[]> = {
  smoke: [],
  functional: ["Public Content", "Release Publishing", "Media Library", "Member Identity"],
  "security-smoke": ["Authentication", "Protected Media", "Media Safety"],
  "data-health": ["Data Integrity", "Media Library"],
  "artists-verify": ["Public Content"],
  "releases-verify": ["Release Publishing", "Data Integrity", "Media Safety"],
  "media-verify": ["Media Safety", "Protected Media", "Media Library", "Media Intake"],
  "public-links-verify": ["Public Content", "Media Safety"],
  "email-verify": ["Email"],
  "auth-verify": ["Authentication", "Member Identity"],
};

const openSeveritiesByCommand: Record<string, LaunchBlockerSeverity[]> = {
  smoke: ["P0", "P1"],
  functional: ["P0", "P1"],
  "security-smoke": ["P0", "P1"],
  "data-health": ["P0", "P1"],
  "artists-verify": ["P0", "P1"],
  "releases-verify": ["P0", "P1"],
  "media-verify": ["P0", "P1"],
  "public-links-verify": ["P0", "P1"],
  "email-verify": ["P0", "P1"],
  "auth-verify": ["P0", "P1"],
};

const areas = commandAreas[command];
if (!areas) {
  console.error(JSON.stringify({ success: false, error: `Unknown launch verification command: ${command}` }, null, 2));
  process.exit(1);
}

const report = await productionLaunchBlockerService.getReport();
const scopedChecks = areas.length ? report.checks.filter((check) => areas.includes(check.area)) : report.checks;
const scopedBlockers = areas.length ? report.blockers.filter((blocker) => areas.includes(blocker.area)) : report.blockers;
const failSeverities = openSeveritiesByCommand[command] ?? ["P0", "P1"];
const blocking = scopedBlockers.filter((blocker) => blocker.status === "open" && failSeverities.includes(blocker.severity));

const output = {
  success: blocking.length === 0,
  command,
  decision: blocking.length === 0 ? report.decision : "FUNCTIONALLY_BLOCKED",
  checkedAt: report.generatedAt,
  environment: report.environment,
  checks: scopedChecks,
  blockers: scopedBlockers,
  summary: report.summary,
};

console.log(JSON.stringify(output, null, 2));
if (blocking.length > 0) process.exit(1);
