import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CreditCard, Receipt, RefreshCw, TrendingUp } from "lucide-react";
import { adminBillingApiService } from "../services/AdminBillingApiService";

export function AdminBillingPage({ focus = "billing" }: { focus?: "billing" | "subscriptions" | "payments" | "invoices" | "refunds" | "coupons" | "promotions" | "gifts" | "revenue" | "payment-providers" }) {
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = () => {
    setError("");
    adminBillingApiService.overview().then(setOverview).catch((err) => setError(err instanceof Error ? err.message : "Unable to load billing."));
  };

  useEffect(load, []);

  const revenue = overview?.revenue as Record<string, unknown> | undefined;
  const health = overview?.health as Record<string, unknown> | undefined;
  const createCoupon = async () => {
    const code = `LAUNCH-${Date.now().toString().slice(-5)}`;
    await adminBillingApiService.createCoupon(code);
    setMessage(`Coupon ${code} created.`);
    load();
  };

  return (
    <main className="space-y-6">
      <section className="rounded-md border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyanGlow">Billing Admin</p>
            <h1 className="mt-2 text-3xl font-semibold capitalize text-white">{focus.replace(/-/g, " ")}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">Subscription lifecycle, checkout readiness, invoices, refunds, coupons, promotions, gifts, providers, revenue, and entitlement synchronization.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/8" onClick={load}><RefreshCw size={16} /> Refresh</button>
        </div>
        {message ? <p className="mt-4 rounded-md border border-cyanGlow/20 bg-cyanGlow/10 p-3 text-sm text-cyan-50">{message}</p> : null}
        {error ? <p className="mt-4 rounded-md border border-rose-300/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="MRR" value={`$${(Number(revenue?.mrrCents ?? 0) / 100).toFixed(2)}`} icon={<TrendingUp size={18} />} />
        <Metric title="Active Subscriptions" value={String(revenue?.activeSubscriptions ?? 0)} icon={<CreditCard size={18} />} />
        <Metric title="Invoices" value={String(health?.invoices ?? 0)} icon={<Receipt size={18} />} />
        <Metric title="Provider" value={String(((health?.providerHealth as Record<string, unknown> | undefined)?.selectedProductionProvider) ?? "stripe")} icon={<CreditCard size={18} />} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Plans" data={overview?.plans} />
        <Panel title="Subscriptions" data={overview?.subscriptions} />
        <Panel title="Revenue" data={overview?.revenue} />
        <Panel title="Provider Health" data={(health?.providerHealth as unknown) ?? {}} />
        <Panel title="Coupons" data={overview?.coupons} action={<button className="rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/8" onClick={createCoupon}>Create Launch Coupon</button>} />
        <Panel title="Promotions and Gifts" data={{ promotions: overview?.promotions, gifts: overview?.gifts }} />
      </section>
    </main>
  );
}

function Metric({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return <div className="rounded-md border border-white/10 bg-white/[0.04] p-4"><div className="flex items-center gap-2 text-cyanGlow">{icon}<p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">{title}</p></div><p className="mt-3 text-2xl font-semibold text-white">{value}</p></div>;
}

function Panel({ title, data, action }: { title: string; data: unknown; action?: ReactNode }) {
  return <section className="rounded-md border border-white/10 bg-white/[0.04] p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold text-white">{title}</h2>{action}</div><pre className="mt-4 max-h-96 overflow-auto rounded-md bg-black/30 p-3 text-xs text-white/64">{JSON.stringify(data ?? {}, null, 2)}</pre></section>;
}
