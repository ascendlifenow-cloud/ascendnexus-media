import { CalendarDays, ClipboardCheck, FileText, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { useOperationsOverview } from "../hooks/useOperationsOverview";

const record = (value: unknown) => value && typeof value === "object" ? value as Record<string, unknown> : {};
const list = (value: unknown) => Array.isArray(value) ? value : [];
const text = (value: unknown, fallback = "unknown") => typeof value === "string" && value ? value : fallback;
const numberValue = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;

function StatusPill({ value }: { value: unknown }) {
  const label = text(value);
  const tone = /healthy|ready|passed|verified|completed/.test(label)
    ? "border-emerald-400/40 bg-emerald-400/12 text-emerald-100"
    : /fail|critical|paused|blocked|unavailable/.test(label)
      ? "border-red-400/40 bg-red-400/12 text-red-100"
      : "border-anm-gold/40 bg-anm-gold/12 text-anm-gold";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

function MiniTable({ rows, columns }: { rows: unknown[]; columns: Array<{ key: string; label: string }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-white/45">
          <tr>{columns.map((column) => <th key={column.key} className="px-3 py-2 font-semibold">{column.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {rows.slice(0, 8).map((row, index) => {
            const item = record(row);
            return (
              <tr key={String(item.id ?? item.workflowId ?? item.calendarEventId ?? item.campaignId ?? item.verificationId ?? index)} className="text-white/72">
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-2 align-top">
                    {column.key === "status" ? <StatusPill value={item[column.key]} /> : String(item[column.key] ?? "—")}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {!rows.length ? <p className="px-3 py-4 text-sm text-white/55">No records yet.</p> : null}
    </div>
  );
}

export function AdminOperationsPage({ focus = "overview" }: { focus?: string }) {
  const { overview, calendar, workflows, campaigns, verifications, recommendations, reports, loading, errors, refresh, runVerification, generateReport } = useOperationsOverview();
  const metrics = record(record(overview?.metrics).metrics);
  const contentHealth = record(overview?.contentHealth);
  const launchHealth = record(overview?.launchHealth);
  const queues = record(overview?.queues);
  const today = record(overview?.today);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Operations"
        title={focus === "overview" ? "Post-Launch Operations" : focus.replace(/-/g, " ")}
        status="ready"
        description="Coordinate release workflows, scheduling, verification, campaigns, content health, recommendations, reports, and growth operations."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="glass" onClick={() => void refresh()}><RefreshCw className="h-4 w-4" aria-hidden />Refresh</Button>
            <Button type="button" variant="glass" onClick={() => void runVerification()}><ShieldCheck className="h-4 w-4" aria-hidden />Run QA</Button>
            <Button type="button" variant="primary" onClick={() => void generateReport()}><FileText className="h-4 w-4" aria-hidden />Daily Report</Button>
          </div>
        }
      />

      {loading ? <p className="text-sm text-white/62">Loading operations state...</p> : null}
      {errors.length ? <AdminSectionCard title="API Errors"><ul className="space-y-2 text-sm text-red-100">{errors.map((error) => <li key={error}>{error}</li>)}</ul></AdminSectionCard> : null}

      <div className="grid gap-5 lg:grid-cols-4">
        <AdminSectionCard title="Today"><p className="text-3xl font-semibold text-white">{list(today.releases).length}</p><p className="text-sm text-white/55">releases scheduled</p></AdminSectionCard>
        <AdminSectionCard title="Pending Approvals"><p className="text-3xl font-semibold text-white">{numberValue(metrics.pendingApprovals)}</p><p className="text-sm text-white/55">review-stage workflows</p></AdminSectionCard>
        <AdminSectionCard title="Content Health"><div className="mt-2"><StatusPill value={contentHealth.status} /></div><p className="mt-3 text-sm text-white/55">{list(contentHealth.warnings).length} warnings</p></AdminSectionCard>
        <AdminSectionCard title="Launch Health"><div className="mt-2"><StatusPill value={launchHealth.overallStatus} /></div><p className="mt-3 text-sm text-white/55">{list(launchHealth.criticalFailures).length} critical failures</p></AdminSectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <AdminSectionCard title="Publishing Queue" description="Release workflow state and publication queue health.">
          <div className="space-y-3 text-sm text-white/72">
            <p className="flex justify-between">Scheduled <strong>{numberValue(metrics.scheduledReleases)}</strong></p>
            <p className="flex justify-between">Failed or paused <strong>{numberValue(metrics.failedReleases)}</strong></p>
            <p className="flex justify-between">Publication status <StatusPill value={record(queues.publication).status} /></p>
          </div>
        </AdminSectionCard>
        <AdminSectionCard title="Media Processing Queue">
          <pre className="max-h-40 overflow-auto rounded bg-black/25 p-3 text-xs text-white/65">{JSON.stringify(queues.mediaProcessing ?? {}, null, 2)}</pre>
        </AdminSectionCard>
        <AdminSectionCard title="Campaign Queues">
          <div className="space-y-3 text-sm text-white/72">
            <p className="flex justify-between">Social <strong>{numberValue(queues.social)}</strong></p>
            <p className="flex justify-between">Email/newsletter <strong>{numberValue(queues.email)}</strong></p>
          </div>
        </AdminSectionCard>
      </div>

      <AdminSectionCard title="Release Workflows" description="Every transition is backend-controlled and audited in workflow history.">
        <MiniTable rows={workflows} columns={[{ key: "title", label: "Title" }, { key: "releaseType", label: "Type" }, { key: "status", label: "Status" }, { key: "scheduledFor", label: "Scheduled" }]} />
      </AdminSectionCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminSectionCard title="Publishing Calendar" description="Upcoming releases, campaigns, homepage features, and milestones.">
          <MiniTable rows={calendar} columns={[{ key: "title", label: "Event" }, { key: "eventType", label: "Type" }, { key: "status", label: "Status" }, { key: "startsAt", label: "Starts" }]} />
        </AdminSectionCard>
        <AdminSectionCard title="Release Verification" description="Release completion is blocked until required QA checks pass.">
          <MiniTable rows={verifications} columns={[{ key: "entityType", label: "Entity" }, { key: "entityId", label: "ID" }, { key: "status", label: "Status" }, { key: "verifiedAt", label: "Checked" }]} />
        </AdminSectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminSectionCard title="Social & Newsletter Campaigns">
          <MiniTable rows={campaigns} columns={[{ key: "title", label: "Campaign" }, { key: "campaignType", label: "Type" }, { key: "status", label: "Status" }, { key: "scheduledFor", label: "Scheduled" }]} />
        </AdminSectionCard>
        <AdminSectionCard title="Optimization Recommendations">
          <MiniTable rows={recommendations} columns={[{ key: "title", label: "Recommendation" }, { key: "category", label: "Category" }, { key: "severity", label: "Severity" }, { key: "status", label: "Status" }]} />
        </AdminSectionCard>
      </div>

      <AdminSectionCard title="Operational Reports" description="Daily, weekly, monthly, quarterly, and yearly reports summarize publishing, growth, performance, reliability, SEO, media, failures, and recommendations.">
        <MiniTable rows={reports} columns={[{ key: "reportType", label: "Type" }, { key: "status", label: "Status" }, { key: "summary", label: "Summary" }, { key: "generatedAt", label: "Generated" }]} />
      </AdminSectionCard>

      <AdminSectionCard title="Automation Coverage">
        <div className="grid gap-3 text-sm text-white/70 md:grid-cols-3">
          <p className="rounded border border-white/10 p-3"><CalendarDays className="mb-2 h-4 w-4 text-anm-gold" aria-hidden />Future publishing, embargoes, homepage features, and campaigns are represented in the persisted calendar.</p>
          <p className="rounded border border-white/10 p-3"><ClipboardCheck className="mb-2 h-4 w-4 text-anm-gold" aria-hidden />Release workflows pause on failed QA and require explicit resume or transition.</p>
          <p className="rounded border border-white/10 p-3"><ShieldCheck className="mb-2 h-4 w-4 text-anm-gold" aria-hidden />Verification checks public delivery, metadata, SEO, images, previews, storage/CDN, search, homepage, and monitoring.</p>
        </div>
      </AdminSectionCard>
    </div>
  );
}
