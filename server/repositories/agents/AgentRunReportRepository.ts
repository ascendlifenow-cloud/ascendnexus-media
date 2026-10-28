import fs from "node:fs/promises";
import path from "node:path";
import { databaseConnectionService } from "../../database/DatabaseConnectionService";
import { getBackendConfig } from "../../config/backendConfig";
import type { AgentRunReport } from "../../models/agents/AgentStatusModels";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";

// Deliberately outside the legacy snapshot registry: broad catalog rewrites must never erase agent reports.
export const agentReportCollection = "agent_run_reports";
export class AgentRunReportRepository {
  private indexed?: Promise<void>;
  private async collection() {
    const db = await databaseConnectionService.getDb();
    const collection = db.collection(agentReportCollection);
    this.indexed ??= collection.createIndexes([
      { key: { reportId: 1 }, name: "agent_report_id", unique: true },
      { key: { runId: 1, revision: -1 }, name: "agent_run_revision", unique: true },
      { key: { team: 1, occurredAt: -1 }, name: "agent_team_reported" },
    ]).then(() => undefined).catch((error) => { this.indexed = undefined; throw error; });
    await this.indexed;
    return collection;
  }
  private mongo() { return Boolean(getBackendConfig().database.uri); }
  private file() { return path.join(getBackendConfig().storage.dataRoot, "agent-run-reports.json"); }
  private async local(): Promise<AgentRunReport[]> {
    try { return JSON.parse(await fs.readFile(this.file(), "utf8")); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  }
  async getById(reportId: string): Promise<AgentRunReport | null> {
    if (!this.mongo()) return (await this.local()).find((r) => r.reportId === reportId) ?? null;
    return await (await this.collection()).findOne({ reportId }, { projection: { _id: 0 } }) as unknown as AgentRunReport | null;
  }
  async latest(runId: string): Promise<AgentRunReport | null> {
    if (!this.mongo()) return (await this.local()).filter((r) => r.runId === runId).sort((a, b) => b.revision - a.revision)[0] ?? null;
    return await (await this.collection()).findOne({ runId }, { sort: { revision: -1 }, projection: { _id: 0 } }) as unknown as AgentRunReport | null;
  }
  async append(report: AgentRunReport) {
    if (this.mongo()) {
      try { await (await this.collection()).insertOne({ ...report }); }
      catch (error) { if ((error as { code?: number }).code === 11000) throw new MediaApiError("AGENT_REPORT_CONFLICT", "This report or revision already exists.", 409, "validation"); throw error; }
      return;
    }
    await fs.mkdir(path.dirname(this.file()), { recursive: true });
    const lock = await fs.open(`${this.file()}.lock`, "wx", 0o600).catch(() => { throw new MediaApiError("AGENT_REPORT_BUSY", "Reporting is busy. Retry shortly.", 409, "validation"); });
    try {
      const reports = await this.local();
      if (reports.some((r) => r.reportId === report.reportId || r.runId === report.runId && r.revision === report.revision)) throw new MediaApiError("AGENT_REPORT_CONFLICT", "This report or revision already exists.", 409, "validation");
      const temporary = `${this.file()}.tmp`;
      await fs.writeFile(temporary, JSON.stringify([...reports, report]), { mode: 0o600 });
      await fs.rename(temporary, this.file());
    } finally { await lock.close(); await fs.unlink(`${this.file()}.lock`); }
  }
  async runs(team?: string, status?: string): Promise<{ reports: AgentRunReport[]; total: number }> {
    if (!this.mongo()) {
      const latest = new Map<string, AgentRunReport>();
      for (const report of await this.local()) if ((latest.get(report.runId)?.revision ?? 0) < report.revision) latest.set(report.runId, report);
      const reports = [...latest.values()].filter((r) => (!team || r.team === team) && (!status || r.status === status)).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      return { reports: reports.slice(0, 100), total: reports.length };
    }
    const rows = await (await this.collection()).aggregate([
      { $sort: { runId: 1, revision: -1 } }, { $group: { _id: "$runId", latest: { $first: "$$ROOT" } } }, { $replaceRoot: { newRoot: "$latest" } },
      { $match: { ...(team ? { team } : {}), ...(status ? { status } : {}) } },
      { $facet: { reports: [{ $sort: { occurredAt: -1, runId: 1 } }, { $limit: 100 }, { $project: { _id: 0 } }], count: [{ $count: "total" }] } },
    ]).toArray();
    return { reports: rows[0]?.reports ?? [], total: rows[0]?.count[0]?.total ?? 0 };
  }
  async logs(runId: string, beforeRevision: number, limit: number): Promise<AgentRunReport[]> {
    if (!this.mongo()) return (await this.local()).filter((r) => r.runId === runId && r.revision < beforeRevision).sort((a, b) => b.revision - a.revision).slice(0, limit);
    return await (await this.collection()).find({ runId, revision: { $lt: beforeRevision } }, { projection: { _id: 0 } }).sort({ revision: -1 }).limit(limit).toArray() as unknown as AgentRunReport[];
  }
}
