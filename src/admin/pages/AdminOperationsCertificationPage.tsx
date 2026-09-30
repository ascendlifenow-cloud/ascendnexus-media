import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Route, ShieldCheck } from "lucide-react";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { adminLaunchReadinessApiService, type AdminOperationsCertificationReport } from "../services/AdminLaunchReadinessApiService";

const decisionTone: Record<string, string> = {
  "ADMIN OPERATIONS READY": "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
  "ADMIN OPERATIONS READY WITH POST-LAUNCH ITEMS": "border-amber-300/25 bg-amber-500/10 text-amber-100",
  "ADMIN OPERATIONS BLOCKED": "border-rose-300/25 bg-rose-500/10 text-rose-100",
};

export function AdminOperationsCertificationPage() {
  const [report, setReport] = useState<AdminOperationsCertificationReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    adminLaunchReadinessApiService.getAdminOperationsReport()
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load admin operations certification."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const decision = report?.decision ?? "ADMIN OPERATIONS READY WITH POST-LAUNCH ITEMS";

  return (
    <main className="space-y-6">
      <AdminPageHeader
        eyebrow="ANM-WEB-130"
        title="Admin Operations Certification"
        status={report?.decision === "ADMIN OPERATIONS BLOCKED" ? "disabled" : "ready"}
        description="Launch-critical admin auth, navigation, artist/release/media/publication/export/import/permission certification."
        actions={<button className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/8" onClick={load}><RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh</button>}
      />

      {error ? <p className="rounded-md border border-rose-300/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p> : null}

      <section className={`rounded-md border p-5 ${decisionTone[decision]}`}>
        <div className="flex items-center gap-3">
          {decision === "ADMIN OPERATIONS READY" ? <CheckCircle2 /> : <AlertTriangle />}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">Final Admin Decision</p>
            <h2 className="mt-1 text-2xl font-semibold">{report?.decision ?? "Loading"}</h2>
          </div>
        </div>
        <p className="mt-3 text-sm opacity-80">{report?.finalMessage ?? "Collecting admin operations evidence."}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="P0 Open" value={String(report?.counts.p0Open ?? 0)} />
        <Metric title="P1 Open" value={String(report?.counts.p1Open ?? 0)} />
        <Metric title="P2 Open" value={String(report?.counts.p2Open ?? 0)} />
        <Metric title="Checks Passed" value={String(report?.counts.checksPassed ?? 0)} />
      </section>

      <AdminSectionCard title="Route Inventory">
        <div className="grid gap-3 xl:grid-cols-2">
          {(report?.routeInventory ?? []).map((route) => (
            <article key={`${route.requestedPath}-${route.canonicalPath}`} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-mono text-sm text-white"><Route size={16} /> {route.requestedPath}</h3>
                <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold uppercase text-emerald-100">{route.status}</span>
              </div>
              <p className="mt-2 font-mono text-xs text-cyanGlow">{route.canonicalPath}</p>
              <p className="mt-1 text-xs text-white/56">{route.notes}</p>
            </article>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Checks">
        <div className="grid gap-3 xl:grid-cols-2">
          {(report?.checks ?? []).map((check) => (
            <article key={check.checkId} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-white">{check.area}</h3>
                <span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${check.status === "pass" ? "bg-emerald-500/15 text-emerald-100" : check.status === "warn" ? "bg-amber-500/15 text-amber-100" : "bg-rose-500/15 text-rose-100"}`}>{check.status}</span>
              </div>
              <p className="mt-2 text-sm text-white/62">{check.summary}</p>
            </article>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Issues">
        <div className="space-y-3">
          {(report?.issues ?? []).length === 0 ? <p className="text-sm text-white/62">No open issues reported.</p> : null}
          {(report?.issues ?? []).map((issue) => (
            <article key={issue.issueId} className="rounded-md border border-white/10 bg-black/20 p-4">
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

      <AdminSectionCard title="Evidence">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><ShieldCheck size={16} /> Certification artifacts</h2>
        <ul className="mt-3 grid gap-2 text-sm text-white/64 md:grid-cols-2">
          {(report?.evidenceReferences ?? []).map((item) => <li key={item}>{item}</li>)}
        </ul>
      </AdminSectionCard>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-md border border-white/10 bg-white/[0.04] p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">{title}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>;
}
