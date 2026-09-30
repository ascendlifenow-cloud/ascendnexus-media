import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { adminMemberEcosystemCertificationApiService } from "../services/AdminMemberEcosystemCertificationApiService";

export function AdminMemberEcosystemCertificationPage({ focus = "production-certification" }: { focus?: "production-certification" | "launch-readiness" | "member-certification" | "security-certification" | "performance-certification" }) {
  const [certification, setCertification] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    adminMemberEcosystemCertificationApiService.production().then(setCertification).catch((err) => setError(err instanceof Error ? err.message : "Unable to load certification."));
  };

  useEffect(load, []);

  const readiness = certification?.readiness as Record<string, unknown> | undefined;
  const domains = (certification?.domains as Array<Record<string, unknown>> | undefined) ?? [];
  const blockers = (readiness?.blockers as string[] | undefined) ?? [];
  const warnings = (readiness?.warnings as string[] | undefined) ?? [];
  const approved = readiness?.decision === "approved";

  return (
    <main className="space-y-6">
      <section className="rounded-md border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyanGlow">Member Ecosystem Certification</p>
            <h1 className="mt-2 text-3xl font-semibold capitalize text-white">{focus.replace(/-/g, " ")}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">Final production sign-off for identity, membership, protected media, portal, engagement, CRM, billing, security, performance, accessibility, deployment, and observability.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/8" onClick={load}><RefreshCw size={16} /> Refresh</button>
        </div>
        {error ? <p className="mt-4 rounded-md border border-rose-300/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p> : null}
      </section>

      <section className={`rounded-md border p-5 ${approved ? "border-emerald-300/20 bg-emerald-500/10" : "border-amber-300/20 bg-amber-500/10"}`}>
        <div className="flex items-center gap-3">
          {approved ? <CheckCircle2 className="text-emerald-200" /> : <XCircle className="text-amber-100" />}
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/52">Launch Decision</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">{String(readiness?.decision ?? certification?.decision ?? "pending")}</h2>
          </div>
        </div>
        <p className="mt-3 text-sm text-white/70">{String(certification?.finalMessage ?? "Certification has not run.")}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric title="Certified Domains" value={`${String(certification?.certifiedCount ?? 0)} / ${String(certification?.domainCount ?? 0)}`} />
        <Metric title="Blockers" value={String(blockers.length)} />
        <Metric title="Warnings" value={String(warnings.length)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {domains.map((domain) => (
          <article key={String(domain.domain)} className="rounded-md border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold capitalize text-white">{String(domain.domain)}</h2>
              <span className="rounded-full border border-white/10 px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white/64">{String(domain.status)}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/62">{String(domain.summary)}</p>
            <List title="Evidence" items={(domain.evidence as string[] | undefined) ?? []} />
            <List title="Warnings" items={(domain.warnings as string[] | undefined) ?? []} />
            <List title="Blockers" items={(domain.blockers as string[] | undefined) ?? []} tone="danger" />
          </article>
        ))}
      </section>

      <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-white"><ShieldAlert size={18} /> Certification Payload</h2>
        <pre className="mt-4 max-h-96 overflow-auto rounded-md bg-black/30 p-3 text-xs text-white/64">{JSON.stringify(certification ?? {}, null, 2)}</pre>
      </section>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-md border border-white/10 bg-white/[0.04] p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">{title}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>;
}

function List({ title, items, tone = "normal" }: { title: string; items: string[]; tone?: "normal" | "danger" }) {
  if (!items.length) return null;
  return <div className="mt-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">{title}</p><ul className={`mt-2 space-y-1 text-sm ${tone === "danger" ? "text-rose-100" : "text-white/62"}`}>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}
