import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Globe2, RefreshCw, ServerCog, ShieldCheck } from "lucide-react";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { adminLaunchReadinessApiService, type ProductionInfrastructureCertificationReport } from "../services/AdminLaunchReadinessApiService";

const tone: Record<string, string> = {
  "INFRASTRUCTURE READY": "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
  "INFRASTRUCTURE READY WITH POST-LAUNCH ITEMS": "border-amber-300/25 bg-amber-500/10 text-amber-100",
  "INFRASTRUCTURE BLOCKED": "border-rose-300/25 bg-rose-500/10 text-rose-100",
};

export function AdminLaunchInfrastructurePage() {
  const [report, setReport] = useState<ProductionInfrastructureCertificationReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    adminLaunchReadinessApiService.getInfrastructureReport()
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load infrastructure readiness."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const decision = report?.decision ?? "INFRASTRUCTURE BLOCKED";

  return (
    <main className="space-y-6">
      <AdminPageHeader
        eyebrow="ANM-WEB-131"
        title="Production Infrastructure"
        status={decision === "INFRASTRUCTURE BLOCKED" ? "disabled" : "ready"}
        description="Production environment, secrets, database, Redis, workers, storage, CDN, email, DNS, TLS, deployment, backup, restore, and rollback readiness."
        actions={<button className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/8" onClick={load}><RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh</button>}
      />

      {error ? <p className="rounded-md border border-rose-300/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p> : null}

      <section className={`rounded-md border p-5 ${tone[decision]}`}>
        <div className="flex items-center gap-3">
          {decision === "INFRASTRUCTURE READY" ? <CheckCircle2 /> : <AlertTriangle />}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">Final Infrastructure Decision</p>
            <h2 className="mt-1 text-2xl font-semibold">{report?.decision ?? "Loading"}</h2>
          </div>
        </div>
        <p className="mt-3 text-sm opacity-80">{report?.finalMessage ?? "Collecting production infrastructure evidence."}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <Metric title="P0" value={String(report?.counts.p0Open ?? 0)} />
        <Metric title="P1" value={String(report?.counts.p1Open ?? 0)} />
        <Metric title="P2" value={String(report?.counts.p2Open ?? 0)} />
        <Metric title="Passed" value={String(report?.counts.checksPassed ?? 0)} />
        <Metric title="Failed" value={String(report?.counts.checksFailed ?? 0)} />
      </section>

      <AdminSectionCard title="Infrastructure Summary">
        <div className="grid gap-3 md:grid-cols-3">
          {Object.entries(report?.summary ?? {}).map(([key, value]) => <Metric key={key} title={key} value={String(value)} />)}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Environment Categories">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(report?.environmentMatrix.categories ?? {}).map(([category, counts]) => (
            <article key={category} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
              <h3 className="flex items-center gap-2 font-semibold text-white"><ShieldCheck size={16} /> {category}</h3>
              <p className="mt-2 text-sm text-white/62">Configured {counts.configured} · Missing {counts.missing} · Invalid {counts.invalid} · Optional {counts.optional}</p>
            </article>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Architecture">
        <div className="grid gap-3 xl:grid-cols-2">
          {(report?.architecture ?? []).map((item) => (
            <article key={item.component} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
              <h3 className="flex items-center gap-2 font-semibold text-white"><ServerCog size={16} /> {item.component}</h3>
              <p className="mt-2 text-sm text-white/70">{item.provider}</p>
              <p className="mt-1 text-xs text-white/48">{item.exposure} · {item.healthCheck}</p>
            </article>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Checks">
        <div className="grid gap-3 xl:grid-cols-2">
          {(report?.checks ?? []).map((check) => (
            <article key={check.checkId} className="rounded-md border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold text-white"><Database size={16} /> {check.area}</h3>
                <span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${check.status === "pass" ? "bg-emerald-500/15 text-emerald-100" : check.status === "warn" ? "bg-amber-500/15 text-amber-100" : "bg-rose-500/15 text-rose-100"}`}>{check.status}</span>
              </div>
              <p className="mt-2 text-sm text-white/62">{check.summary}</p>
            </article>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Open Infrastructure Issues">
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

      <AdminSectionCard title="Evidence">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Globe2 size={16} /> Certification artifacts</h2>
        <ul className="mt-3 grid gap-2 text-sm text-white/64 md:grid-cols-2">
          {(report?.evidenceReferences ?? []).map((item) => <li key={item}>{item}</li>)}
        </ul>
      </AdminSectionCard>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-md border border-white/10 bg-white/[0.04] p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">{title}</p><p className="mt-2 text-xl font-semibold text-white">{value}</p></div>;
}
