import { readFile } from "node:fs/promises";
import { getBackendConfig } from "../server/config/backendConfig";
import { agentStatusService } from "../server/services/agents/AgentStatusService";
import { databaseConnectionService } from "../server/database/DatabaseConnectionService";

try {
const environment = process.argv.find((arg) => arg.startsWith("--environment="))?.slice(14);
const file = process.argv.find((arg) => arg.startsWith("--file="))?.slice(7);
const execute = process.argv.includes("--execute");
const config = getBackendConfig();
if (!file || !["local", "staging"].includes(environment ?? "") || config.app.isProduction) throw new Error("Specify a local/staging report file; production reporting is not enabled by this command.");
if (environment === "staging" && (!/stag(?:ing|ging)/i.test(config.database.databaseName ?? "") || !config.database.uri)) throw new Error("Staging database configuration required.");
if (environment === "local" && config.database.uri) throw new Error("Local reporting cannot use a remote database.");
const reports: unknown = JSON.parse(await readFile(file, "utf8"));
if (!Array.isArray(reports) || reports.length > 30) throw new Error("Expected at most 30 safe reports.");
const { validateAgentReport } = await import("../server/services/agents/AgentStatusContract");
for (const report of reports) validateAgentReport(report);
  if (execute) for (const report of reports) await agentStatusService.report(report, "ANMX-AGENT-003-coordinator", environment!);
  console.log(JSON.stringify({ environment, mode: execute ? "execute" : "validate", reports: reports.length, publicActions: false, release: config.app.commitSha ?? "local-unversioned" }));
} catch {
  console.error("Agent reporting failed. Check the safe report contract, revision and authorized environment. No raw payload or connection details are logged.");
  process.exitCode = 1;
} finally { await databaseConnectionService.disconnect(); }
