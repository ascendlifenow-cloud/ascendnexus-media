import { AgentRunReportRepository } from "../../repositories/agents/AgentRunReportRepository";
import { agentStatuses, agentTeams } from "../../models/agents/AgentStatusModels";
import { agentRunSummary, buildAgentReport, validateAgentReport } from "./AgentStatusContract";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";

export class AgentStatusService {
  constructor(private readonly repository = new AgentRunReportRepository()) {}
  async report(value: unknown, actorId: string, environment: string) {
    const input = validateAgentReport(value);
    const existing = await this.repository.getById(input.reportId);
    if (existing) {
      const { revision, occurredAt: _time, reportedBy, environment: savedEnvironment, schemaVersion: _schema, ...saved } = existing;
      if (JSON.stringify({ ...saved, expectedRevision: revision - 1 }) !== JSON.stringify(input) || reportedBy !== actorId || savedEnvironment !== environment) throw new MediaApiError("AGENT_REPORT_CONFLICT", "The report identifier is already in use.", 409, "validation");
      return agentRunSummary(existing);
    }
    const report = buildAgentReport(input, await this.repository.latest(input.runId), actorId, environment);
    await this.repository.append(report);
    return agentRunSummary(report);
  }
  async runs(parameters: URLSearchParams) {
    const team = parameters.get("team") || undefined;
    const status = parameters.get("status") || undefined;
    if (team && !agentTeams.includes(team as never) || status && !agentStatuses.includes(status as never)) throw new MediaApiError("AGENT_FILTER_INVALID", "Select a valid team and status.", 400, "validation");
    const result = await this.repository.runs(team, status);
    return { runs: result.reports.map((report) => agentRunSummary(report)), total: result.total, generatedAt: new Date().toISOString(), reportingMode: "reported_assignments" };
  }
  async logs(runId: string, parameters: URLSearchParams) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(runId)) throw new MediaApiError("AGENT_RUN_NOT_FOUND", "Assignment not found.", 404, "validation");
    const requested = Number(parameters.get("limit") ?? 50);
    const before = Number(parameters.get("beforeRevision") ?? Number.MAX_SAFE_INTEGER);
    if (!Number.isSafeInteger(requested) || requested < 1 || !Number.isSafeInteger(before) || before < 1) throw new MediaApiError("AGENT_PAGE_INVALID", "Invalid log page.", 400, "validation");
    const limit = Math.min(requested, 100);
    const current = await this.repository.latest(runId);
    if (!current) throw new MediaApiError("AGENT_RUN_NOT_FOUND", "Assignment not found.", 404, "database");
    const reports = await this.repository.logs(runId, before, limit + 1);
    const logs = reports.slice(0, limit).map(({ reportedBy: _actor, schemaVersion: _schema, ...report }) => report);
    const hasMore = reports.length > limit;
    return { run: agentRunSummary(current), logs, hasMore, nextBeforeRevision: hasMore ? logs[logs.length - 1]?.revision : undefined };
  }
}
export const agentStatusService = new AgentStatusService();
