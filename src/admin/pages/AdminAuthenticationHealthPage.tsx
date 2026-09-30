import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { adminApiBase } from "../services/AdminAuthApiService";

export function AdminAuthenticationHealthPage() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${adminApiBase()}/api/admin/auth/health`, { credentials: "include" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || payload.success === false) throw new Error(payload.errors?.join(" ") || "Authentication health unavailable.");
        setHealth(payload.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Authentication health unavailable."));
  }, []);

  return (
    <main className="p-6 text-white">
      <section className="rounded-md border border-white/10 bg-anm-surface-glass p-6 shadow-anm-card-glow">
        <ShieldAlert className="h-8 w-8 text-anm-blue" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold">Authentication diagnostics</h1>
        {error ? <p role="alert" className="mt-4 rounded-md border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p> : null}
        {health ? (
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {["overallStatus", "authMode", "adminUserExists", "bootstrapRequired", "rolesReady", "permissionsReady", "sessionStoreReady", "cookiePolicyReady", "csrfReady", "corsReady", "trustedProxyReady", "passwordResetReady", "mfaReady"].map((key) => (
              <div key={key} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                <dt className="text-white/50">{key}</dt>
                <dd className="mt-1 font-semibold">{String(health[key] ?? "unknown")}</dd>
              </div>
            ))}
          </dl>
        ) : !error ? <p className="mt-4 text-sm text-white/62">Loading authentication health...</p> : null}
      </section>
    </main>
  );
}
