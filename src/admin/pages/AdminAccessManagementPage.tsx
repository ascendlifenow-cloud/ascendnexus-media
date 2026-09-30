import { useEffect, useState } from "react";
import { adminAccessApiService } from "../services/AdminAccessApiService";

export function AdminAccessManagementPage({ focus = "overview" }: { focus?: string }) {
  const [catalog, setCatalog] = useState<Record<string, unknown> | null>(null);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [simulation, setSimulation] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminAccessApiService.catalogData().then(setCatalog).catch((err) => setError(err instanceof Error ? err.message : "Unable to load access catalog."));
    adminAccessApiService.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  const tiers = Array.isArray(catalog?.tiers) ? catalog.tiers as Array<Record<string, unknown>> : [];
  const entitlements = Array.isArray(catalog?.entitlements) ? catalog.entitlements as Array<Record<string, unknown>> : [];
  const grants = Array.isArray(catalog?.tierGrants) ? catalog.tierGrants as Array<Record<string, unknown>> : [];

  return (
    <main className="space-y-6">
      <section className="rounded-md border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyanGlow">Access engine</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{focus.replace(/-/g, " ")}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">Consumer membership entitlements are evaluated separately from administrative RBAC. This console reads the centralized catalog, policy health, and simulator endpoints.</p>
        {error ? <p className="mt-4 rounded-md border border-rose-300/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["overall", String(health?.overallStatus ?? "-")],
          ["tiers", tiers.length],
          ["entitlements", entitlements.length],
          ["tier grants", grants.length],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-md border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{String(value)}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-semibold text-white">Membership tiers</h2>
          <div className="mt-4 space-y-3">
            {tiers.map((tier) => (
              <div key={String(tier.tierId)} className="rounded-md border border-white/10 p-3">
                <p className="font-semibold text-white">{String(tier.name)} <span className="text-xs text-white/40">({String(tier.tierKey)})</span></p>
                <p className="mt-1 text-sm text-white/58">{String(tier.description ?? "")}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-semibold text-white">Policy health</h2>
          <pre className="mt-4 max-h-80 overflow-auto rounded-md bg-black/30 p-3 text-xs text-white/70">{JSON.stringify(health ?? {}, null, 2)}</pre>
        </div>
      </section>

      <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-xl font-semibold text-white">Access simulator</h2>
        <p className="mt-2 text-sm text-white/58">This uses the production evaluator with a guest subject and a premium resource sample.</p>
        <button
          className="mt-4 rounded-md border border-cyanGlow/40 px-4 py-2 text-sm font-semibold text-cyanGlow"
          onClick={() => adminAccessApiService.simulate({ subjectType: "guest", resourceType: "release", action: "view", accessClassification: "premium_member" }).then(setSimulation)}
        >
          Run guest premium simulation
        </button>
        {simulation ? <pre className="mt-4 max-h-80 overflow-auto rounded-md bg-black/30 p-3 text-xs text-white/70">{JSON.stringify(simulation, null, 2)}</pre> : null}
      </section>
    </main>
  );
}
