import fs from "node:fs/promises";
import path from "node:path";
import { productionContentReadinessService } from "../../server/services/launch/content/ProductionContentReadinessService";

const commandArg = process.argv.find((arg) => arg.startsWith("--command="));
const command = commandArg?.split("=")[1] ?? "content-health";
const jsonOnly = process.argv.includes("--json");
const writeDocs = !process.argv.includes("--no-docs");

const commandScopes: Record<string, string[]> = {
  "content-health": [],
  "artists-certify": ["Artists"],
  "releases-certify": ["Releases"],
  "media-certify": ["Media"],
  "assignments-certify": ["Artists", "Releases", "Media"],
  "publication-certify": ["Releases", "Public Links"],
  "public-links-certify": ["Public Links"],
  "search-certify": [],
  "homepage-certify": [],
  "protected-media-certify": ["Protected Media"],
  "content-orphan-scan": ["Media", "Data Integrity"],
  "content-duplicate-scan": ["Data Integrity"],
  "media-binary-verify": ["Media"],
  "public-routes-verify": ["Public Links"],
  "protected-media-verify": ["Protected Media"],
};

if (!commandScopes[command]) {
  console.error(JSON.stringify({ success: false, error: `Unknown ANM-WEB-127 command: ${command}` }, null, 2));
  process.exit(1);
}

const report = await productionContentReadinessService.getReport();
if (writeDocs) {
  const docs = productionContentReadinessService.buildMarkdownDocuments(report);
  const docsDir = path.join(process.cwd(), "docs");
  await fs.mkdir(docsDir, { recursive: true });
  await Promise.all(Object.entries(docs).map(([fileName, markdown]) => fs.writeFile(path.join(docsDir, fileName), markdown)));
}

const scopes = commandScopes[command];
const scopedIssues = scopes.length ? report.issues.filter((issue) => scopes.includes(issue.area)) : report.issues;
const scopedChecks = scopes.length ? report.checks.filter((check) => scopes.includes(check.area)) : report.checks;
const blocking = scopedIssues.filter((issue) => issue.status === "open" && (issue.severity === "P0" || issue.severity === "P1"));
const success = blocking.length === 0;

const output = {
  success,
  command,
  promptId: report.promptId,
  decision: success ? report.decision : "CONTENT BLOCKED",
  generatedAt: report.generatedAt,
  counts: report.counts,
  checks: scopedChecks,
  issues: scopedIssues,
  evidence: writeDocs ? {
    docsGenerated: Object.keys(productionContentReadinessService.buildMarkdownDocuments(report)).map((fileName) => `docs/${fileName}`),
  } : undefined,
};

console.log(JSON.stringify(output, null, 2));
if (!success) process.exit(1);
