import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Route, ShieldCheck } from "lucide-react";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { adminLaunchReadinessApiService, type AdminLaunchExperienceCertificationReport } from "../services/AdminLaunchReadinessApiService";

const decisionTone: Record<string, string> = {
  "EXPERIENCE READY": "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
  "EXPERIENCE READY WITH POST-LAUNCH ITEMS": "border-amber-300/25 bg-amber-500/10 text-amber-100",
  "EXPERIENCE BLOCKED": "border-rose-300/25 bg-rose-500/10 text-rose-100",
};

export function AdminLaunchExperiencePage() {
  const [report, setReport] = useState<AdminLaunchExperienceCertificationReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    adminLaunchReadinessApiService.getExperienceReport()
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load experience certification."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const health = report?.health;
  const decision = health?.decision ?? "EXPERIENCE READY WITH POST-LAUNCH ITEMS";

  return (
    <main className="space-y-6">
      <AdminPageHeader
        eyebrow="ANM-WEB-129"
        title="Experience Launch Certification"
        status={health?.decision === "EXPERIENCE BLOCKED" ? "disabled" : "ready"}
        description="Public website, guest shell, member shell, route, media-safety, accessibility, performance, and browser-evidence launch view."
        actions={<button className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/8" onClick={load}><RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh</button>}
      />

      {error ? <p className="rounded-md border border-rose-300/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p> : null}

      <section className={`rounded-md border p-5 ${decisionTone[decision]}`}>
        <div className="flex items-center gap-3">
          {decision === "EXPERIENCE READY" ? <CheckCircle2 /> : <AlertTriangle />}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">Final Experience Decision</p>
            <h2 className="mt-1 text-2xl font-semibold">{health?.decision ?? "Loading"}</h2>
          </div>
        </div>
        <p className="mt-3 text-sm opacity-80">{health?.finalMessage ?? "Collecting public/member experience evidence."}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="P0 Open" value={String(health?.counts.p0Open ?? 0)} />
        <Metric title="P1 Open" value={String(health?.counts.p1Open ?? 0)} />
        <Metric title="P2 Open" value={String(health?.counts.p2Open ?? 0)} />
        <Metric title="Checks Passed" value={String(health?.counts.checksPassed ?? 0)} />
      </section>

      <AdminSectionCard title="Required Routes">
        <div className="grid gap-4 xl:grid-cols-2">
          <RouteList title="Public" routes={health?.publicRoutes ?? []} />
          <RouteList title="Member" routes={health?.memberRoutes ?? []} />
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Access Matrix">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-white/42">
              <tr>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Public</th>
                <th className="px-3 py-2">Preview</th>
                <th className="px-3 py-2">Stream</th>
                <th className="px-3 py-2">Download</th>
                <th className="px-3 py-2">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {(health?.accessMatrix ?? []).map((row) => (
                <tr key={row.subject}>
                  <td className="px-3 py-3 font-semibold text-white">{row.subject}</td>
                  <td className="px-3 py-3 text-white/64">{row.publicContent}</td>
                  <td className="px-3 py-3 text-white/64">{row.publicPreview}</td>
                  <td className="px-3 py-3 text-white/64">{row.protectedStream}</td>
                  <td className="px-3 py-3 text-white/64">{row.protectedDownload}</td>
                  <td className="px-3 py-3 text-white/64">{row.adminExperience}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Issues">
        <div className="space-y-3">
          {(health?.issues ?? []).length === 0 ? <p className="text-sm text-white/62">No open issues reported.</p> : null}
          {(health?.issues ?? []).map((issue) => (
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
          {(health?.evidenceReferences ?? []).map((item) => <li key={item}>{item}</li>)}
        </ul>
      </AdminSectionCard>
    </main>
  );
}

function RouteList({ title, routes }: { title: string; routes: Array<{ path: string; status: string; summary: string }> }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
      <h3 className="flex items-center gap-2 font-semibold text-white"><Route size={16} /> {title}</h3>
      <div className="mt-3 space-y-2">
        {routes.map((route) => (
          <div key={route.path} className="flex items-start justify-between gap-3 rounded-md bg-black/20 px-3 py-2">
            <div>
              <p className="font-mono text-sm text-white">{route.path}</p>
              <p className="mt-1 text-xs text-white/52">{route.summary}</p>
            </div>
            <span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${route.status === "pass" ? "bg-emerald-500/15 text-emerald-100" : "bg-rose-500/15 text-rose-100"}`}>{route.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-md border border-white/10 bg-white/[0.04] p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">{title}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>;
}
