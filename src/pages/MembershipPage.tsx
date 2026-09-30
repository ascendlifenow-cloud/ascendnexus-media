import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { publicMembershipApiService, type PublicMembershipTier } from "../services/membership/PublicMembershipApiService";

export function MembershipPage() {
  const [tiers, setTiers] = useState<PublicMembershipTier[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    publicMembershipApiService.listTiers().then(setTiers).catch((err) => setError(err instanceof Error ? err.message : "Unable to load membership tiers."));
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6">
      <section className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyanGlow">Membership</p>
        <h1 className="mt-3 text-4xl font-semibold text-white md:text-5xl">Choose your Ascend Nexus access</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-white/68">
          Guest and Free access are active now. Premium, Supporter, and VIP tiers are prepared for entitlement-based access and will connect to billing in the next membership phase.
        </p>
      </section>

      {error ? <div className="mb-6 rounded-md border border-rose-300/20 bg-rose-500/10 p-4 text-sm text-rose-50">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" aria-label="Membership tier comparison">
        {tiers.map((tier) => (
          <article key={tier.tierKey} className="flex min-h-[22rem] flex-col rounded-md border border-white/10 bg-white/[0.04] p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">{tier.availability === "available" ? "Available" : "Readiness"}</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{tier.name}</h2>
              <p className="mt-3 text-sm leading-6 text-white/64">{tier.description}</p>
            </div>
            <ul className="mt-5 flex-1 space-y-2 text-sm text-white/72">
              {tier.benefits.map((benefit) => <li key={benefit}>• {benefit}</li>)}
            </ul>
            <div className="mt-5">
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-white/40">{tier.billingReadiness}</p>
              <Link className="inline-flex w-full justify-center rounded-md border border-cyanGlow/40 px-4 py-2 text-sm font-semibold text-cyanGlow" to={tier.tierKey === "guest" ? "/" : "/register"}>
                {tier.tierKey === "guest" ? "Continue as guest" : tier.availability === "available" ? "Create free account" : "Join waitlist readiness"}
              </Link>
            </div>
          </article>
        ))}
        {!tiers.length && !error ? <div className="col-span-full rounded-md border border-white/10 bg-white/[0.04] p-8 text-center text-white/60">Loading membership tiers...</div> : null}
      </section>
    </main>
  );
}
