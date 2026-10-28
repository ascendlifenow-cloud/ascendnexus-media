import { agentStatuses, agentTeams, type AgentReportInput, type AgentRunReport } from "../../models/agents/AgentStatusModels";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";

const invalid = () => new MediaApiError("AGENT_REPORT_INVALID", "Agent report does not meet the safe reporting contract.", 400, "validation");
const unsafe = /https?:\/\/|(?:bearer\s+|(?:password|secret|token|api[_ -]?key)\s*[:=]\s*)\S+|\b(?:sk-|ghp_|github_pat_|eyJ)[A-Za-z0-9_.-]{10,}|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\/(?:Users|private|tmp|app|home)\/)|[a-z]:\\|[A-Za-z0-9_+/=-]{90,}/i;
const text = (value: unknown, max: number): string => {
  if (typeof value !== "string" || !value.trim() || value.length > max || unsafe.test(value) || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) throw invalid();
  return value.trim();
};
const identifier = (value: unknown) => {
  const result = text(value, 100);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(result)) throw invalid();
  return result;
};

export function validateAgentReport(value: unknown): AgentReportInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
  const v = value as Record<string, unknown>;
  const fields = ["reportId", "runId", "team", "agentName", "assignment", "status", "summary", "blockers", "evidence", "expectedRevision"];
  if (Object.keys(v).some((key) => !fields.includes(key))) throw invalid();
  if (!agentTeams.includes(v.team as never) || !agentStatuses.includes(v.status as never)) throw invalid();
  if (!Number.isSafeInteger(v.expectedRevision) || Number(v.expectedRevision) < 0) throw invalid();
  if (!Array.isArray(v.blockers) || v.blockers.length > 12 || !Array.isArray(v.evidence) || v.evidence.length > 12) throw invalid();
  const evidence = v.evidence.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item) || Object.keys(item).some((key) => !["label", "path"].includes(key))) throw invalid();
    const label = text(item.label, 160);
    if (item.path === undefined) return { label };
    const path = text(item.path, 220);
    if (!/^(?:\/admin\/[a-zA-Z0-9/_-]+|(?:docs|scripts)\/[a-zA-Z0-9/_.-]+)$/.test(path) || path.includes("..")) throw invalid();
    return { label, path };
  });
  const result: AgentReportInput = { reportId: identifier(v.reportId), runId: identifier(v.runId), team: v.team as AgentReportInput["team"], agentName: text(v.agentName, 80), assignment: text(v.assignment, 240), status: v.status as AgentReportInput["status"], summary: text(v.summary, 1000), blockers: v.blockers.map((item) => text(item, 240)), evidence, expectedRevision: Number(v.expectedRevision) };
  if (result.status === "blocked" && !result.blockers.length) throw invalid();
  if (result.status === "completed" && (!result.evidence.length || result.blockers.length)) throw invalid();
  return result;
}

export function buildAgentReport(input: AgentReportInput, previous: AgentRunReport | null, reportedBy: string, environment: string, now = new Date()): AgentRunReport {
  if (input.expectedRevision !== (previous?.revision ?? 0)) throw new MediaApiError("AGENT_REPORT_CONFLICT", "Refresh the assignment before reporting another update.", 409, "validation");
  if (previous && (previous.agentName !== input.agentName || previous.team !== input.team || previous.assignment !== input.assignment || ["completed", "cancelled"].includes(previous.status))) throw new MediaApiError("AGENT_RUN_IMMUTABLE", "Use a new run for a new or finished assignment.", 409, "validation");
  const { expectedRevision, ...safe } = input;
  return { ...safe, revision: expectedRevision + 1, occurredAt: now.toISOString(), reportedBy: identifier(reportedBy), environment: identifier(environment), schemaVersion: 1 };
}

export function agentRunSummary(report: AgentRunReport, now = Date.now()) {
  const { reportedBy: _actor, schemaVersion: _schema, reportId: _id, occurredAt, ...safe } = report;
  return { ...safe, lastReportedAt: occurredAt, isStale: report.status === "running" && now - Date.parse(occurredAt) > 15 * 60 * 1000, executionMode: "bounded_assignment" as const };
}
