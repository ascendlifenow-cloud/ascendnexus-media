import { RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { adminMemberExperienceApiService } from "../services/AdminMemberExperienceApiService";

export function AdminMemberExperiencePage() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const load = () => adminMemberExperienceApiService.health().then(setHealth).catch((err) => setError(err instanceof Error ? err.message : "Unable to load member experience health."));
  useEffect(() => {
    void load();
  }, []);

  const cards: Array<[string, string]> = [
    ["Overall", String(health?.overallStatus ?? "-")],
    ["Dashboard", String(health?.dashboardStatus ?? "-")],
    ["Membership", String(health?.membershipStatus ?? "-")],
    ["Content", String(health?.contentStatus ?? "-")],
    ["Recommendations", String(health?.recommendationStatus ?? "-")],
    ["Privacy", String(health?.privacyStatus ?? "-")],
  ];

  return (
    <main className="space-y-6">
      <section className="rounded-md border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyanGlow">Member experience</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Portal Health</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">Operational visibility for member shell, dashboard API, profile, preferences, security, recommendations, cache safety, and protected playback integration.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/8" onClick={load}><RefreshCw size={16} /> Refresh</button>
        </div>
        {error ? <p className="mt-4 rounded-md border border-rose-300/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p> : null}
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {cards.map(([label, value]) => <div key={label} className="rounded-md border border-white/10 bg-white/[0.04] p-4"><ShieldCheck className="text-cyanGlow" size={18} /><p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-white/42">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>)}
      </section>
      <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-xl font-semibold text-white">Health report</h2>
        <pre className="mt-4 max-h-96 overflow-auto rounded-md bg-black/30 p-3 text-xs text-white/70">{JSON.stringify(health ?? {}, null, 2)}</pre>
      </section>
    </main>
  );
}
