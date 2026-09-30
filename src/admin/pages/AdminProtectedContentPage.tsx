import { useEffect, useState } from "react";
import { adminProtectedContentApiService } from "../services/AdminProtectedContentApiService";

export function AdminProtectedContentPage({ focus = "overview" }: { focus?: string }) {
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [profiles, setProfiles] = useState<Array<Record<string, unknown>>>([]);
  const [assets, setAssets] = useState<Array<Record<string, unknown>>>([]);
  const [sessions, setSessions] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminProtectedContentApiService.overviewData().then(setOverview).catch((err) => setError(err instanceof Error ? err.message : "Unable to load protected delivery."));
    adminProtectedContentApiService.profiles().then(setProfiles).catch(() => setProfiles([]));
    adminProtectedContentApiService.assets().then(setAssets).catch(() => setAssets([]));
    adminProtectedContentApiService.sessions().then(setSessions).catch(() => setSessions([]));
  }, []);

  const health = overview?.health as Record<string, unknown> | undefined;
  const statCards: Array<[string, string | number]> = [
    ["overall", String(health?.overallStatus ?? "-")],
    ["assets", typeof overview?.protectedAssetCount === "number" ? overview.protectedAssetCount : assets.length],
    ["active auth", typeof overview?.activeAuthorizations === "number" ? overview.activeAuthorizations : "-"],
    ["playback", typeof overview?.activePlaybackSessions === "number" ? overview.activePlaybackSessions : sessions.length],
  ];

  return (
    <main className="space-y-6">
      <section className="rounded-md border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyanGlow">Protected content</p>
        <h1 className="mt-2 text-3xl font-semibold capitalize text-white">{focus.replace(/-/g, " ")}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">Secure delivery status for private media, short-lived stream authorization, download authorization, playback sessions, and public exposure safety.</p>
        {error ? <p className="mt-4 rounded-md border border-rose-300/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {statCards.map(([label, value]) => (
          <div key={String(label)} className="rounded-md border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{String(value)}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-semibold text-white">Delivery profiles</h2>
          <div className="mt-4 space-y-3">
            {profiles.map((profile) => (
              <div key={String(profile.deliveryProfileId)} className="rounded-md border border-white/10 p-3">
                <p className="font-semibold text-white">{String(profile.name)}</p>
                <p className="mt-1 text-sm text-white/58">{String(profile.deliveryMode)} · {String(profile.requiredEntitlementKey)} · TTL {String(profile.tokenTtlSeconds)}s</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-semibold text-white">Health</h2>
          <pre className="mt-4 max-h-80 overflow-auto rounded-md bg-black/30 p-3 text-xs text-white/70">{JSON.stringify(health ?? {}, null, 2)}</pre>
        </div>
      </section>
    </main>
  );
}
