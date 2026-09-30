import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FileClock, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { adminLaunchReadinessApiService, type ProductionSecurityRecoveryCertificationReport } from "../services/AdminLaunchReadinessApiService";

const tone: Record<string, string> = {
  "SECURITY READY": "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
  "SECURITY READY WITH POST-LAUNCH ITEMS": "border-amber-300/25 bg-amber-500/10 text-amber-100",
  "SECURITY BLOCKED": "border-rose-300/25 bg-rose-500/10 text-rose-100",
};

export function AdminLaunchSecurityRecoveryPage() {
  const [report, setReport] = useState<ProductionSecurityRecoveryCertificationReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    adminLaunchReadinessApiService.getSecurityRecoveryReport()
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load security certification."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const decision = report?.decision ?? "SECURITY BLOCKED";

  return (
    <main className="space-y-6">
      <AdminPageHeader
        eyebrow="ANM-WEB-132"
        title="Security Recovery Certification"
        status={decision === "SECURITY BLOCKED" ? "disabled" : "ready"}
        description="Production security, privacy, observability, alerting, backup, restore, rollback, media protection, and incident-response launch gate."
        actions={<button className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/8" onClick={load}><RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh</button>}
      />

      {error ? <p className="rounded-md border border-rose-300/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p> : null}

      <section className={`rounded-md border p-5 ${tone[decision]}`}>
        <div className="flex items-center gap-3">
          {decision === "SECURITY READY" ? <CheckCircle2 /> : <AlertTriangle />}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">Final Security Decision</p>
            <h2 className="mt-1 text-2xl font-semibold">{report?.decision ?? "Loading"}</h2>
          </div>
        </div>
        <p className="mt-3 text-sm opacity-80">{report?.finalMessage ?? "Collecting production security evidence."}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <Metric title="P0" value={String(report?.counts.p0Open ?? 0)} />
        <Metric title="P1" value={String(report?.counts.p1Open ?? 0)} />
        <Metric title="P2" value={String(report?.counts.p2Open ?? 0)} />
        <Metric title="Passed" value={String(report?.counts.checksPassed ?? 0)} />
        <Metric title="Failed" value={String(report?.counts.checksFailed ?? 0)} />
      </section>

      <AdminSectionCard title="Certification Summary">
        <div className="grid gap-3 md:grid-cols-3">
          {Object.entries(report?.summary ?? {}).map(([key, value]) => <Metric key={key} title={key} value={String(value)} />)}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Security Controls">
        <div className="grid gap-3 xl:grid-cols-2">
          {(report?.controls ?? []).map((control) => (
            <article key={control.controlKey} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold text-white"><ShieldCheck size={16} /> {control.controlKey}</h3>
                <StatusPill status={control.status} />
              </div>
              <p className="mt-2 text-sm text-white/62">{control.enforcementPoint}</p>
              <p className="mt-1 text-xs text-white/44">{control.evidence}</p>
            </article>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Attack Surface">
        <div className="grid gap-3 xl:grid-cols-2">
          {(report?.attackSurface ?? []).map((surface) => (
            <article key={surface.surface} className="rounded-md border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold text-white"><ShieldAlert size={16} /> {surface.surface}</h3>
                <StatusPill status={surface.certificationStatus} />
              </div>
              <p className="mt-2 text-sm text-white/62">{surface.exposure} · {surface.residualRisk}</p>
            </article>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Checks">
        <div className="grid gap-3 xl:grid-cols-2">
          {(report?.checks ?? []).map((check) => (
            <article key={check.checkId} className="rounded-md border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold text-white"><FileClock size={16} /> {check.area}</h3>
                <StatusPill status={check.status} />
              </div>
              <p className="mt-2 text-sm text-white/62">{check.summary}</p>
            </article>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Open Security Issues">
        <div className="space-y-3">
          {(report?.issues ?? []).map((issue) => (
            <article key={issue.issueId} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-white">{issue.title}</h3>
                <span className="rounded-full border border-white/10 px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white/70">{issue.severity} · {issue.area}</span>
              </div>
              <p className="mt-2 text-sm text-white/62">{issue.evidence}</p>
              <p className="mt-2 text-sm text-cyanGlow">{issue.remediation}</p>
            </article>
          ))}
        </div>
      </AdminSectionCard>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const color = status === "pass" ? "bg-emerald-500/15 text-emerald-100" : status === "warn" ? "bg-amber-500/15 text-amber-100" : "bg-rose-500/15 text-rose-100";
  return <span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${color}`}>{status}</span>;
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-md border border-white/10 bg-white/[0.04] p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">{title}</p><p className="mt-2 text-xl font-semibold text-white">{value}</p></div>;
}
