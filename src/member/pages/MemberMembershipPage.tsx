import { Link } from "react-router-dom";
import { useMemberPortal } from "../hooks/useMemberPortal";
import { PageHeader, Panel } from "./memberPageParts";

export function MemberMembershipPage() {
  const { dashboard } = useMemberPortal();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Membership" title="Membership and benefits">Current access is server-authoritative. Billing remains readiness-only until ANM-WEB-117.</PageHeader>
      <Panel title="Current membership">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-3xl font-semibold text-white">{dashboard.membership?.name ?? "Free Member"}</p>
            <p className="mt-2 text-sm text-white/58">Status: {dashboard.membership?.status ?? "active"}</p>
            <p className="mt-1 text-sm text-white/58">Billing: {dashboard.membership?.billingReadiness === "readiness_only" ? "Readiness only" : "Not configured"}</p>
          </div>
          <p className="text-sm leading-6 text-white/62">{dashboard.membershipCta.message}</p>
        </div>
      </Panel>
      <Panel title="Benefits">
        <div className="grid gap-3 sm:grid-cols-2">
          {dashboard.capabilities.map((capability) => <div key={capability.category} className="rounded-md border border-white/10 bg-black/20 p-4"><p className="font-semibold text-white">{capability.category}</p><p className="mt-2 text-sm text-white/58">{capability.label}</p></div>)}
        </div>
      </Panel>
      <Panel title="Upgrade readiness">
        <p className="text-sm leading-6 text-white/62">Premium, supporter, and VIP tiers are represented by access policies and entitlements. Active checkout and subscription synchronization are intentionally deferred to ANM-WEB-117.</p>
        <Link to="/membership" className="mt-4 inline-flex rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/8">View public tier comparison</Link>
      </Panel>
    </div>
  );
}
