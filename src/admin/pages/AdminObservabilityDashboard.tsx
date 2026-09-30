import { RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { useObservabilityOverview } from "../hooks/useObservabilityOverview";

const record = (value: unknown) => value && typeof value === "object" ? value as Record<string, unknown> : {};
const list = (value: unknown) => Array.isArray(value) ? value.map(String) : [];
const text = (value: unknown, fallback = "unknown") => typeof value === "string" && value ? value : fallback;

function StatusPill({ value }: { value: unknown }) {
  const label = text(value);
  const tone = /healthy|approved|certified|passed/.test(label) ? "border-emerald-400/40 bg-emerald-400/12 text-emerald-100" : /block|fail|unavailable|not_certified/.test(label) ? "border-red-400/40 bg-red-400/12 text-red-100" : "border-anm-gold/40 bg-anm-gold/12 text-anm-gold";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

export function AdminObservabilityDashboard() {
  const { overview, certification, loading, errors, refresh } = useObservabilityOverview();
  const health = record(overview?.health);
  const reliability = record(overview?.reliability);
  const synthetics = record(overview?.synthetics);
  const metrics = record(overview?.metrics);
  const certBlockers = list(certification?.blockingIssues);
  const certWarnings = list(certification?.warnings);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="System"
        title="Observability & Certification"
        status="ready"
        description="Review production health, telemetry status, synthetics, reliability gates, and final certification evidence."
        actions={<Button type="button" variant="glass" onClick={() => void refresh()}><RefreshCw className="h-4 w-4" aria-hidden />Refresh</Button>}
      />

      {loading ? <p className="text-sm text-white/62">Loading observability state...</p> : null}
      {errors.length ? <AdminSectionCard title="API Errors"><ul className="space-y-2 text-sm text-red-100">{errors.map((error) => <li key={error}>{error}</li>)}</ul></AdminSectionCard> : null}

      <div className="grid gap-5 lg:grid-cols-4">
        <AdminSectionCard title="Health"><p className="flex items-center justify-between text-sm text-white/70">Overall <StatusPill value={health.overallStatus} /></p></AdminSectionCard>
        <AdminSectionCard title="Telemetry"><p className="flex items-center justify-between text-sm text-white/70">Metrics <StatusPill value={record(metrics).status} /></p></AdminSectionCard>
        <AdminSectionCard title="Synthetics"><p className="flex items-center justify-between text-sm text-white/70">Status <StatusPill value={synthetics.status} /></p></AdminSectionCard>
        <AdminSectionCard title="Certification"><p className="flex items-center justify-between text-sm text-white/70">Decision <StatusPill value={certification?.decision} /></p></AdminSectionCard>
      </div>

      <AdminSectionCard title="Reliability Gate" description="This gate blocks launch when critical health, synthetics, consistency, security, deployment, or rollback evidence is missing.">
        <div className="space-y-3 text-sm">
          <p className="flex items-center justify-between text-white/70">Decision <StatusPill value={reliability.decision} /></p>
          {list(reliability.blockers).length ? <ul className="space-y-2 text-red-100">{list(reliability.blockers).map((item) => <li key={item}>{item}</li>)}</ul> : <p className="text-white/62">No reliability blockers reported.</p>}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Final Certification Blockers">
        {certBlockers.length ? <ul className="space-y-2 text-sm text-red-100">{certBlockers.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="text-sm text-white/62">No certification blockers reported.</p>}
      </AdminSectionCard>

      <AdminSectionCard title="Warnings">
        {certWarnings.length ? <ul className="space-y-2 text-sm text-anm-gold">{certWarnings.slice(0, 12).map((item) => <li key={item}>{item}</li>)}</ul> : <p className="text-sm text-white/62">No warnings reported.</p>}
      </AdminSectionCard>
    </div>
  );
}
