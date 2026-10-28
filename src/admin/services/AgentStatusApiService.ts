import { adminApiBase } from "./AdminAuthApiService";

export const agentTeams = ["engineering", "creative", "validation", "coordination"] as const;
export const agentStatuses = ["queued", "running", "blocked", "completed", "failed", "cancelled"] as const;
export type AgentTeam = typeof agentTeams[number];
export type AgentStatus = typeof agentStatuses[number];
export interface AgentEvidence { label: string; path?: string }
export interface AgentRun {
  runId: string;
  team: AgentTeam;
  agentName: string;
  assignment: string;
  status: AgentStatus;
  summary: string;
  blockers: string[];
  evidence: AgentEvidence[];
  revision: number;
  lastReportedAt: string;
  isStale: boolean;
  executionMode: "bounded_assignment";
}
export interface AgentReport extends Omit<AgentRun, "assignment" | "lastReportedAt" | "isStale" | "executionMode"> {
  reportId: string;
  occurredAt: string;
}
export interface AgentRunsResponse {
  runs: AgentRun[];
  total: number;
  generatedAt: string;
  reportingMode: "reported_assignments";
}
export interface AgentLogsResponse {
  run: AgentRun;
  logs: AgentReport[];
  hasMore: boolean;
  nextBeforeRevision?: number;
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${adminApiBase()}/api/admin/agents${path}`, {
    credentials: "include", cache: "no-store", signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Assignment reports are unavailable. Please retry.");
  const result = await response.json() as { success: boolean; data?: T };
  if (result.success !== true || !result.data) throw new Error("Assignment reports are unavailable. Please retry.");
  return result.data;
}

export const agentStatusApiService = {
  getRuns(filters: { team?: AgentTeam; status?: AgentStatus } = {}, signal?: AbortSignal) {
    const params = new URLSearchParams();
    if (filters.team) params.set("team", filters.team);
    if (filters.status) params.set("status", filters.status);
    return request<AgentRunsResponse>(`/runs${params.size ? `?${params}` : ""}`, signal);
  },
  getLogs(runId: string, beforeRevision?: number, signal?: AbortSignal) {
    const params = new URLSearchParams({ limit: "50" });
    if (beforeRevision !== undefined) params.set("beforeRevision", String(beforeRevision));
    return request<AgentLogsResponse>(`/runs/${encodeURIComponent(runId)}/logs?${params}`, signal);
  },
};
