import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CreditCard, FileText, Gift, History, RefreshCw } from "lucide-react";
import { memberBillingApiService } from "../services/MemberBillingApiService";

export function MemberBillingPage({ focus = "billing" }: { focus?: "billing" | "subscription" | "payment-methods" | "invoices" | "receipts" | "cancel" | "upgrade" | "downgrade" | "history" }) {
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    memberBillingApiService.overview().then(setOverview).catch((err) => setError(err instanceof Error ? err.message : "Billing is unavailable."));
  };

  useEffect(load, []);

  const plans = (overview?.plans as Array<Record<string, unknown>> | undefined) ?? [];
  const subscriptions = (overview?.subscriptions as Array<Record<string, unknown>> | undefined) ?? [];
  const invoices = (overview?.invoices as Array<Record<string, unknown>> | undefined) ?? [];
  const payments = (overview?.payments as Array<Record<string, unknown>> | undefined) ?? [];
  const current = overview?.currentSubscription as Record<string, unknown> | undefined;

  const checkout = async (planKey: string) => {
    setError("");
    setMessage("");
    try {
      const result = await memberBillingApiService.checkout(planKey, couponCode || undefined);
      setMessage(String(result.safeMessage ?? "Checkout session created."));
      await memberBillingApiService.overview().then(setOverview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    }
  };

  const cancel = async () => {
    setError("");
    setMessage("");
    try {
      await memberBillingApiService.cancel();
      setMessage("Subscription cancellation recorded.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancellation failed.");
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-md border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyanGlow">Billing</p>
            <h1 className="mt-2 text-3xl font-semibold capitalize text-white">{focus.replace(/-/g, " ")}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">Manage membership plans, subscription state, invoices, receipts, payment history, coupons, and upgrade readiness.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/8" onClick={load}><RefreshCw size={16} /> Refresh</button>
        </div>
        {message ? <p className="mt-4 rounded-md border border-cyanGlow/20 bg-cyanGlow/10 p-3 text-sm text-cyan-50">{message}</p> : null}
        {error ? <p className="mt-4 rounded-md border border-rose-300/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p> : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <Summary title="Current" value={String(current?.state ?? "none")} icon={<CreditCard size={18} />} />
        <Summary title="Subscriptions" value={String(subscriptions.length)} icon={<History size={18} />} />
        <Summary title="Invoices" value={String(invoices.length)} icon={<FileText size={18} />} />
        <Summary title="Payments" value={String(payments.length)} icon={<Gift size={18} />} />
      </section>

      <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-xl font-semibold text-white">Plans</h2>
        <div className="mt-4 flex max-w-md gap-2">
          <input className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Coupon code" />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <article key={String(plan.planKey)} className="rounded-md border border-white/10 bg-black/20 p-4">
              <h3 className="text-lg font-semibold text-white">{String(plan.name)}</h3>
              <p className="mt-2 text-sm text-white/58">{String(plan.description)}</p>
              <p className="mt-3 text-2xl font-semibold text-white">{Number(plan.amountCents) === 0 ? "Included" : `$${(Number(plan.amountCents) / 100).toFixed(2)}`}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/42">{String(plan.interval)} · {String(plan.provider)}</p>
              <button className="mt-4 w-full rounded-md border border-cyanGlow/20 px-3 py-2 text-sm text-cyan-50 hover:bg-cyanGlow/10" onClick={() => checkout(String(plan.planKey))}>{Number(plan.amountCents) === 0 ? "Use Free" : "Start Checkout"}</button>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DataPanel title="Subscriptions" data={subscriptions} />
        <DataPanel title="Invoices and Receipts" data={invoices} />
        <DataPanel title="Payment History" data={payments} />
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-semibold text-white">Cancel Subscription</h2>
          <p className="mt-2 text-sm text-white/58">Cancellation removes paid access after billing synchronization and falls back to Free where policy allows.</p>
          <button className="mt-4 rounded-md border border-amber-300/20 px-3 py-2 text-sm text-amber-100 hover:bg-amber-500/10" onClick={cancel}>Cancel Current Subscription</button>
        </div>
      </section>
    </main>
  );
}

function Summary({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return <div className="rounded-md border border-white/10 bg-white/[0.04] p-4"><div className="flex items-center gap-2 text-cyanGlow">{icon}<p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">{title}</p></div><p className="mt-3 text-2xl font-semibold text-white">{value}</p></div>;
}

function DataPanel({ title, data }: { title: string; data: unknown }) {
  return <section className="rounded-md border border-white/10 bg-white/[0.04] p-5"><h2 className="text-xl font-semibold text-white">{title}</h2><pre className="mt-4 max-h-80 overflow-auto rounded-md bg-black/30 p-3 text-xs text-white/64">{JSON.stringify(data, null, 2)}</pre></section>;
}
