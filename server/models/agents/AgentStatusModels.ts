export const agentTeams = ["engineering", "creative", "validation", "coordination"] as const;
export const agentStatuses = ["queued", "running", "blocked", "completed", "failed", "cancelled"] as const;
export type AgentTeam = typeof agentTeams[number];
export type AgentStatus = typeof agentStatuses[number];
export interface AgentReportInput {
  reportId: string;
  runId: string;
  team: AgentTeam;
  agentName: string;
  assignment: string;
  status: AgentStatus;
  summary: string;
  blockers: string[];
  evidence: { label: string; path?: string }[];
  expectedRevision: number;
}
export interface AgentRunReport extends Omit<AgentReportInput, "expectedRevision"> {
  revision: number;
  occurredAt: string;
  reportedBy: string;
  environment: string;
  schemaVersion: 1;
}
