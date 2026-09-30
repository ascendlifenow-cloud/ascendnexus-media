import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileClock, RefreshCw, Rocket } from "lucide-react";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { adminLaunchReadinessApiService, type FinalLaunchSignoffReport } from "../services/AdminLaunchReadinessApiService";

export function AdminFinalLaunchSignoffPage() {
  const [report, setReport] = useState<FinalLaunchSignoffReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    adminLaunchReadinessApiService.getFinalSignoffReport()
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load final launch signoff."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const decision = report?.decision ?? "NO-GO";

  return (
    <main className="space-y-6">
      <AdminPageHeader
        eyebrow="ANM-WEB-133"
        title="Final Launch Sign-Off"
        status={decision === "GO" ? "ready" : "disabled"}
        description="Evidence-backed final launch rehearsal, blocker registry, production-safe smoke status, and GO / NO-GO decision."
        actions={<button className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/8" onClick={load}><RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh</button>}
      />

      {error ? <p className="rounded-md border border-rose-300/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p> : null}

      <section className={`rounded-md border p-6 ${decision === "GO" ? "border-emerald-300/25 bg-emerald-500/10 text-emerald-100" : "border-rose-300/25 bg-rose-500/10 text-rose-100"}`}>
        <div className="flex items-center gap-3">
          {decision === "GO" ? <CheckCircle2 /> : <AlertTriangle />}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">Final Production Launch Decision</p>
            <h2 className="mt-1 text-4xl font-semibold">{decision}</h2>
          </div>
        </div>
        <p className="mt-3 text-sm opacity-80">{report?.finalMessage ?? "Collecting final launch evidence."}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <Metric title="P0" value={String(report?.counts.openP0 ?? 0)} />
        <Metric title="P1" value={String(report?.counts.openLaunchCriticalP1 ?? 0)} />
        <Metric title="P2" value={String(report?.counts.openP2 ?? 0)} />
        <Metric title="Passed" value={String(report?.counts.gatesPassed ?? 0)} />
        <Metric title="Failed" value={String(report?.counts.gatesFailed ?? 0)} />
      </section>

      <AdminSectionCard title="Release Candidate">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(report?.releaseCandidate ?? {}).map(([key, value]) => <Metric key={key} title={key} value={String(value)} />)}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Certification Gates">
        <div className="grid gap-3 xl:grid-cols-2">
          {(report?.gateSummary ?? []).map((gate) => (
            <article key={gate.promptId} className="rounded-md border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold text-white"><ClipboardCheck size={16} /> {gate.promptId}</h3>
                <StatusPill status={gate.finalGateStatus} />
              </div>
              <p className="mt-2 text-sm text-white/62">{gate.certificationArea} · {gate.decision}</p>
              <p className="mt-1 text-xs text-white/44">P0 {gate.openP0} · P1 {gate.openP1} · P2 {gate.openP2}</p>
            </article>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Failed Checks">
        <div className="grid gap-3 xl:grid-cols-2">
          {(report?.checks ?? []).filter((check) => check.status === "fail").map((check) => (
            <article key={check.checkId} className="rounded-md border border-rose-300/20 bg-rose-500/8 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-white"><FileClock size={16} /> {check.area}</h3>
              <p className="mt-2 text-sm text-white/62">{check.summary}</p>
            </article>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Launch Blockers">
        <div className="space-y-3">
          {(report?.blockerRegistry ?? []).slice(0, 40).map((blocker) => (
            <article key={`${blocker.sourcePrompt}-${blocker.issueId}`} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-white">{blocker.description}</h3>
                <span className="rounded-full border border-white/10 px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white/70">{blocker.severity} · {blocker.sourcePrompt}</span>
              </div>
              <p className="mt-2 text-sm text-white/62">{blocker.launchImpact}</p>
              <p className="mt-2 text-sm text-cyanGlow">{blocker.fix}</p>
            </article>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Evidence">
        <ul className="grid gap-2 text-sm text-white/64 md:grid-cols-2">
          {(report?.evidenceReferences ?? []).map((item) => <li key={item}><Rocket size={14} className="mr-2 inline" />{item}</li>)}
        </ul>
      </AdminSectionCard>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const color = status === "pass" ? "bg-emerald-500/15 text-emerald-100" : status === "warn" ? "bg-amber-500/15 text-amber-100" : "bg-rose-500/15 text-rose-100";
  return <span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${color}`}>{status}</span>;
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-md border border-white/10 bg-white/[0.04] p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">{title}</p><p className="mt-2 break-words text-lg font-semibold text-white">{value}</p></div>;
}
