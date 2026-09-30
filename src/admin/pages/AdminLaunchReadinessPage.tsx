import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { adminLaunchReadinessApiService, type AdminLaunchReadinessReport } from "../services/AdminLaunchReadinessApiService";

const decisionTone = {
  READY: "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
  READY_WITH_POST_LAUNCH_ITEMS: "border-amber-300/25 bg-amber-500/10 text-amber-100",
  FUNCTIONALLY_BLOCKED: "border-rose-300/25 bg-rose-500/10 text-rose-100",
};

export function AdminLaunchReadinessPage() {
  const [report, setReport] = useState<AdminLaunchReadinessReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    adminLaunchReadinessApiService.getReport()
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load launch readiness."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <main className="space-y-6">
      <AdminPageHeader
        eyebrow="ANM-WEB-126"
        title="Launch Readiness"
        status={report?.decision === "FUNCTIONALLY_BLOCKED" ? "disabled" : "ready"}
        description="Production blocker audit, functional gap evidence, and launch decision from server-side checks."
        actions={<button className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/8" onClick={load}><RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh</button>}
      />

      {error ? <p className="rounded-md border border-rose-300/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p> : null}

      <section className={`rounded-md border p-5 ${report ? decisionTone[report.decision] : "border-white/10 bg-white/[0.04] text-white/70"}`}>
        <div className="flex items-center gap-3">
          {report?.decision === "READY" ? <CheckCircle2 /> : report?.decision === "FUNCTIONALLY_BLOCKED" ? <XCircle /> : <AlertTriangle />}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">Functional Launch Decision</p>
            <h2 className="mt-1 text-2xl font-semibold">{report?.decision ?? "Loading"}</h2>
          </div>
        </div>
        <p className="mt-3 text-sm opacity-80">{report?.finalMessage ?? "Collecting launch readiness evidence."}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="P0 Open" value={String(report?.counts.p0Open ?? 0)} />
        <Metric title="P1 Open" value={String(report?.counts.p1Open ?? 0)} />
        <Metric title="P2 Open" value={String(report?.counts.p2Open ?? 0)} />
        <Metric title="Checks Passed" value={String(report?.counts.checksPassed ?? 0)} />
      </section>

      <AdminSectionCard title="Open Blockers">
        <div className="space-y-3">
          {(report?.blockers ?? []).length === 0 ? <p className="text-sm text-white/62">No blockers reported.</p> : null}
          {(report?.blockers ?? []).map((blocker) => (
            <article key={blocker.blockerId} className="rounded-md border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-white">{blocker.title}</h3>
                <span className="rounded-full border border-white/10 px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white/70">{blocker.severity} · {blocker.area}</span>
              </div>
              <p className="mt-2 text-sm text-white/62">{blocker.evidence}</p>
              <p className="mt-2 text-sm text-cyanGlow">{blocker.remediation}</p>
            </article>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Readiness Checks">
        <div className="grid gap-3 xl:grid-cols-2">
          {(report?.checks ?? []).map((check) => (
            <article key={check.checkId} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-white">{check.area}</h3>
                <span className={`rounded-full px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] ${check.status === "pass" ? "bg-emerald-500/15 text-emerald-100" : check.status === "warn" ? "bg-amber-500/15 text-amber-100" : "bg-rose-500/15 text-rose-100"}`}>{check.status}</span>
              </div>
              <p className="mt-2 text-sm text-white/62">{check.summary}</p>
            </article>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Audit Payload">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><ShieldAlert size={16} /> Sanitized launch report</h2>
        <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-black/30 p-3 text-xs text-white/64">{JSON.stringify(report ?? {}, null, 2)}</pre>
      </AdminSectionCard>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-md border border-white/10 bg-white/[0.04] p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">{title}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>;
}
