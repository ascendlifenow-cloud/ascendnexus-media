import { RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { useDistributionOverview } from "../hooks/useDistributionOverview";

const record = (value: unknown) => value && typeof value === "object" ? value as Record<string, unknown> : {};
const list = (value: unknown) => Array.isArray(value) ? value : [];
const text = (value: unknown, fallback = "unknown") => typeof value === "string" && value ? value : fallback;

function StatusPill({ value }: { value: unknown }) {
  const label = text(value);
  const tone = /enabled|completed|verified|ok|uploaded/.test(label) ? "border-emerald-400/40 bg-emerald-400/12 text-emerald-100" : /failed|dead|unavailable|exhausted|missing|revoked/.test(label) ? "border-red-400/40 bg-red-400/12 text-red-100" : "border-anm-gold/40 bg-anm-gold/12 text-anm-gold";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

function Table({ rows, columns }: { rows: unknown[]; columns: Array<{ key: string; label: string }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase text-white/45"><tr>{columns.map((column) => <th className="px-3 py-2" key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody className="divide-y divide-white/10">
          {rows.slice(0, 10).map((row, index) => {
            const item = record(row);
            return <tr className="text-white/72" key={String(item.distributionJobId ?? item.connectorId ?? item.uploadId ?? item.analyticsId ?? item.distributionAuditEventId ?? index)}>{columns.map((column) => <td className="px-3 py-2 align-top" key={column.key}>{column.key.toLowerCase().includes("status") || column.key === "severity" ? <StatusPill value={item[column.key]} /> : String(item[column.key] ?? "—")}</td>)}</tr>;
          })}
        </tbody>
      </table>
      {!rows.length ? <p className="px-3 py-4 text-sm text-white/55">No records yet.</p> : null}
    </div>
  );
}

export function AdminDistributionPage({ focus = "overview" }: { focus?: string }) {
  const { overview, jobs, connectors, queue, analytics, history, loading, errors, refresh, retryFailures } = useDistributionOverview();
  const queued = list(overview?.queuedJobs);
  const running = list(overview?.runningJobs);
  const completed = list(overview?.completedJobs);
  const failed = list(overview?.failedJobs);
  const platformStats = list(overview?.platformStats);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Distribution"
        title={focus === "overview" ? "Distribution Engine" : focus.replace(/-/g, " ")}
        status="ready"
        description="Prepare, transform, upload, verify, retry, monitor, and analyze cross-platform media distribution."
        actions={<div className="flex flex-wrap gap-2"><Button variant="glass" onClick={() => void refresh()}><RefreshCw className="h-4 w-4" aria-hidden />Refresh</Button><Button variant="primary" onClick={() => void retryFailures()}><RotateCcw className="h-4 w-4" aria-hidden />Retry Failed</Button></div>}
      />

      {loading ? <p className="text-sm text-white/62">Loading distribution state...</p> : null}
      {errors.length ? <AdminSectionCard title="API Errors"><ul className="space-y-2 text-sm text-red-100">{errors.map((error) => <li key={error}>{error}</li>)}</ul></AdminSectionCard> : null}

      <div className="grid gap-5 lg:grid-cols-4">
        <AdminSectionCard title="Queued Jobs"><p className="text-3xl font-semibold text-white">{queued.length}</p></AdminSectionCard>
        <AdminSectionCard title="Running Jobs"><p className="text-3xl font-semibold text-white">{running.length}</p></AdminSectionCard>
        <AdminSectionCard title="Completed Jobs"><p className="text-3xl font-semibold text-white">{completed.length}</p></AdminSectionCard>
        <AdminSectionCard title="Failed Jobs"><p className="text-3xl font-semibold text-white">{failed.length}</p></AdminSectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminSectionCard title="Platform Status" description="Connector health, auth status, and API-limit readiness.">
          <Table rows={platformStats.length ? platformStats : connectors} columns={[{ key: "platform", label: "Platform" }, { key: "status", label: "Status" }, { key: "authStatus", label: "Auth" }, { key: "rateLimitStatus", label: "Rate limit" }]} />
        </AdminSectionCard>
        <AdminSectionCard title="Distribution Queues" description="Media transformation, upload, verification, retry, analytics, and cleanup queues.">
          <pre className="max-h-80 overflow-auto rounded bg-black/25 p-3 text-xs text-white/65">{JSON.stringify(queue ?? record(overview?.queue), null, 2)}</pre>
        </AdminSectionCard>
      </div>

      <AdminSectionCard title="Distribution Jobs">
        <Table rows={jobs} columns={[{ key: "entityType", label: "Entity" }, { key: "entityId", label: "ID" }, { key: "status", label: "Status" }, { key: "queueName", label: "Queue" }, { key: "updatedAt", label: "Updated" }]} />
      </AdminSectionCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminSectionCard title="Platform Analytics">
          <Table rows={analytics} columns={[{ key: "platform", label: "Platform" }, { key: "platformId", label: "Platform ID" }, { key: "collectedAt", label: "Collected" }]} />
        </AdminSectionCard>
        <AdminSectionCard title="Distribution History">
          <Table rows={history} columns={[{ key: "eventType", label: "Event" }, { key: "platform", label: "Platform" }, { key: "severity", label: "Severity" }, { key: "message", label: "Message" }]} />
        </AdminSectionCard>
      </div>

      <AdminSectionCard title="Automation Rules">
        <div className="grid gap-3 text-sm text-white/70 md:grid-cols-3">
          <p className="rounded border border-white/10 p-3">Published album workflows can enqueue trailers, singles, shorts, galleries, homepage updates, RSS, social posts, newsletters, and analytics baselines.</p>
          <p className="rounded border border-white/10 p-3">External platforms are pluggable connectors with authentication, validation, upload, verify, update, delete, retry, analytics, health, and rate-limit methods.</p>
          <p className="rounded border border-white/10 p-3">Retries only run for temporary failures; invalid metadata, missing media, deleted releases, revoked credentials, and permission failures move to operator review.</p>
        </div>
      </AdminSectionCard>
    </div>
  );
}
