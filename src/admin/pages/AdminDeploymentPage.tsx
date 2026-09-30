import { RefreshCw, ShieldCheck } from "lucide-react";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { Button } from "../../components/ui/Button";
import { useDeploymentOverview } from "../hooks/useDeploymentOverview";

const text = (value: unknown, fallback = "Unavailable") => typeof value === "string" && value ? value : fallback;
const record = (value: unknown) => value && typeof value === "object" ? value as Record<string, unknown> : {};
const list = (value: unknown) => Array.isArray(value) ? value.map(String) : [];

function StatusPill({ value }: { value: unknown }) {
  const label = text(value, "unknown");
  const tone = /pass|approved|ready|verified|true/.test(label) ? "border-emerald-400/40 bg-emerald-400/12 text-emerald-100" : /block|fail|false|missing/.test(label) ? "border-red-400/40 bg-red-400/12 text-red-100" : "border-anm-gold/40 bg-anm-gold/12 text-anm-gold";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

export function AdminDeploymentPage() {
  const { overview, loading, errors, refresh, verify } = useDeploymentOverview();
  const health = record(overview?.health);
  const release = record(overview?.currentRelease);
  const launchGate = record(overview?.launchGate);
  const maintenance = record(overview?.maintenance);
  const blockingIssues = list(launchGate.blockingIssues);
  const warnings = list(launchGate.warnings);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="System"
        title="Deployment"
        status="ready"
        description="Review release identity, runtime health, launch-gate state, rollback readiness, and maintenance posture from protected production APIs."
        actions={(
          <>
            <Button type="button" variant="glass" onClick={() => void refresh()}><RefreshCw className="h-4 w-4" aria-hidden />Refresh</Button>
            <Button type="button" onClick={() => void verify()}><ShieldCheck className="h-4 w-4" aria-hidden />Run Check</Button>
          </>
        )}
      />

      {loading ? <p className="text-sm text-white/62">Loading deployment state...</p> : null}
      {errors.length ? <AdminSectionCard title="API Errors"><ul className="space-y-2 text-sm text-red-100">{errors.map((error) => <li key={error}>{error}</li>)}</ul></AdminSectionCard> : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <AdminSectionCard title="Current Release">
          <dl className="space-y-3 text-sm">
            <div><dt className="text-white/50">Release</dt><dd className="font-mono text-white">{text(release.deploymentReleaseId)}</dd></div>
            <div><dt className="text-white/50">Version</dt><dd className="text-white">{text(release.version)}</dd></div>
            <div><dt className="text-white/50">Commit</dt><dd className="font-mono text-white">{text(release.commitSha)}</dd></div>
            <div><dt className="text-white/50">Artifact</dt><dd className="font-mono text-white">{text(release.artifactDigest)}</dd></div>
          </dl>
        </AdminSectionCard>

        <AdminSectionCard title="Runtime Health">
          <div className="space-y-3 text-sm">
            <p className="flex items-center justify-between gap-3 text-white/70">Ready <StatusPill value={String(Boolean(health.ready))} /></p>
            {Object.entries(record(health.checks)).map(([key, value]) => (
              <p key={key} className="flex items-center justify-between gap-3 text-white/70">{key}<StatusPill value={value} /></p>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Launch Gate">
          <div className="space-y-3 text-sm">
            <p className="flex items-center justify-between gap-3 text-white/70">Decision <StatusPill value={launchGate.decision} /></p>
            <p className="text-white/60">{blockingIssues.length} blocking issues</p>
            <p className="text-white/60">{warnings.length} warnings</p>
            <p className="text-white/60">Maintenance mode: {String(Boolean(maintenance.enabled))}</p>
          </div>
        </AdminSectionCard>
      </div>

      <AdminSectionCard title="Blocking Issues" description="Production launch remains blocked until every item here has real deployment evidence.">
        {blockingIssues.length ? (
          <ul className="space-y-2 text-sm text-red-100">{blockingIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
        ) : (
          <p className="text-sm text-white/62">No blocking issues reported by the launch gate.</p>
        )}
      </AdminSectionCard>

      <AdminSectionCard title="Warnings">
        {warnings.length ? (
          <ul className="space-y-2 text-sm text-anm-gold">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        ) : (
          <p className="text-sm text-white/62">No warnings reported.</p>
        )}
      </AdminSectionCard>
    </div>
  );
}
