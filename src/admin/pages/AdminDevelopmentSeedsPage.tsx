import { useEffect, useMemo, useState } from "react";
import { DatabaseZap, RefreshCw, RotateCcw, ShieldCheck, Users } from "lucide-react";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminSectionCard } from "../components/AdminSectionCard";
import { adminDevelopmentSeedApiService, type DevelopmentSeedOverview } from "../services/AdminDevelopmentSeedApiService";

const resetConfirmation = "RESET_DEVELOPMENT_IDENTITY_SEEDS";

const StatusPill = ({ status }: { status: string }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status === "pass" || status === "active" ? "bg-emerald-100 text-emerald-800" : status === "blocked" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>
    {status}
  </span>
);

export function AdminDevelopmentSeedsPage() {
  const [overview, setOverview] = useState<DevelopmentSeedOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await adminDevelopmentSeedApiService.overview());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load development seeds.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const runAction = async (action: "run" | "reset" | "verify") => {
    setBusy(action);
    setError(null);
    try {
      if (action === "run") await adminDevelopmentSeedApiService.run();
      if (action === "reset") await adminDevelopmentSeedApiService.reset(resetConfirmation);
      if (action === "verify") await adminDevelopmentSeedApiService.verify();
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Development seed action failed.");
    } finally {
      setBusy(null);
    }
  };

  const stats = useMemo(() => {
    if (!overview) return [];
    const report = overview.verification;
    return [
      { label: "Admin users", value: `${report.adminUsers.actual}/${report.adminUsers.expected}` },
      { label: "Member users", value: `${report.memberUsers.actual}/${report.memberUsers.expected}` },
      { label: "Memberships", value: `${report.membershipAssignments.actual}` },
      { label: "Billing scenarios", value: `${report.billingScenarios.actual}` },
      { label: "Engagement records", value: `${report.engagementRecords.actual}` },
      { label: "Protected resources", value: `${report.protectedContent.actual}` },
    ];
  }, [overview]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Development Operations"
        title="Identity Seed System"
        description="Provision deterministic development and staging identities, content, engagement, access, and billing scenarios without enabling seed paths in production."
        status="ready"
      />

      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={Boolean(busy)} onClick={() => void runAction("run")}>
          <DatabaseZap className="h-4 w-4" aria-hidden />
          {busy === "run" ? "Seeding..." : "Run Seeds"}
        </button>
        <button className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 disabled:opacity-60" disabled={Boolean(busy)} onClick={() => void runAction("verify")}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          {busy === "verify" ? "Verifying..." : "Verify"}
        </button>
        <button className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-800 disabled:opacity-60" disabled={Boolean(busy)} onClick={() => void runAction("reset")}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          {busy === "reset" ? "Resetting..." : "Reset Seeded Data"}
        </button>
      </div>

      <AdminSectionCard title="Seed Verification" description={overview ? `${overview.users.environment} / ${overview.users.seedVersion}` : "Loading seed health."}>
        {loading || !overview ? (
          <div className="text-sm text-slate-600">Loading development seed status...</div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={overview.verification.status} />
              <span className="inline-flex items-center gap-2 text-sm text-slate-700"><ShieldCheck className="h-4 w-4" aria-hidden /> Production guard enabled: {overview.verification.productionProtected ? "yes" : "no"}</span>
              <span className="text-sm text-slate-500">Checked {new Date(overview.verification.checkedAt).toLocaleString()}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-md border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{stat.label}</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-950">{stat.value}</div>
                </div>
              ))}
            </div>
            {overview.verification.errors.length ? <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{overview.verification.errors.join(" ")}</div> : null}
          </div>
        )}
      </AdminSectionCard>

      <AdminSectionCard title="Seed Accounts" description={overview?.users.note ?? "Development and staging login matrix."}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950"><Users className="h-4 w-4" aria-hidden /> Admin accounts</h3>
            <div className="overflow-hidden rounded-md border border-slate-200">
              {(overview?.users.admins ?? []).map((user) => (
                <div key={user.email} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0">
                  <span className="font-medium text-slate-900">{user.email}</span>
                  <span className="text-slate-500">{user.roles?.join(", ")}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950"><Users className="h-4 w-4" aria-hidden /> Member accounts</h3>
            <div className="overflow-hidden rounded-md border border-slate-200">
              {(overview?.users.members ?? []).map((user) => (
                <div key={user.email} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0">
                  <span className="font-medium text-slate-900">{user.email}</span>
                  <span className="text-slate-500">{user.tier} / {user.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminSectionCard>
    </div>
  );
}
