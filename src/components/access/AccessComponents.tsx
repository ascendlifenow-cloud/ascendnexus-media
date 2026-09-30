import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export type MemberAccessState =
  | "allowed"
  | "public"
  | "preview"
  | "authentication_required"
  | "verification_required"
  | "upgrade_required"
  | "early_access_locked"
  | "embargoed"
  | "expired"
  | "suspended"
  | "unavailable"
  | "denied";

export function MemberAccessBadge({ state }: { state: MemberAccessState }) {
  const label = state.replace(/_/g, " ");
  return <span className="inline-flex rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-xs font-semibold capitalize text-white/72">{label}</span>;
}

export function UpgradePrompt({ message = "This content is prepared for a higher membership tier." }: { message?: string }) {
  return (
    <div className="rounded-md border border-cyanGlow/30 bg-cyanGlow/10 p-4 text-sm text-white/78">
      <p>{message}</p>
      <Link className="mt-3 inline-flex rounded-md bg-cyanGlow px-3 py-2 font-semibold text-ink" to="/membership">View membership tiers</Link>
    </div>
  );
}

export function VerificationPrompt() {
  return <div className="rounded-md border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-50">Verify your email before accessing member-only content.</div>;
}

export function SuspendedAccountNotice() {
  return <div className="rounded-md border border-rose-300/30 bg-rose-500/10 p-4 text-sm text-rose-50">This account cannot access protected content right now.</div>;
}

export function EarlyAccessCountdown({ availableAt }: { availableAt?: string }) {
  return <div className="rounded-md border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">Early access opens{availableAt ? ` ${new Date(availableAt).toLocaleString()}` : " soon"}.</div>;
}

export function EmbargoUnavailableState() {
  return <div className="rounded-md border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">This release is not available yet.</div>;
}

export function MemberAccessGate({ state, children }: { state: MemberAccessState; children: ReactNode }) {
  if (state === "allowed" || state === "public" || state === "preview") return <>{children}</>;
  if (state === "verification_required") return <VerificationPrompt />;
  if (state === "suspended") return <SuspendedAccountNotice />;
  if (state === "early_access_locked") return <EarlyAccessCountdown />;
  if (state === "embargoed") return <EmbargoUnavailableState />;
  if (state === "upgrade_required") return <UpgradePrompt />;
  return <UpgradePrompt message="Sign in or upgrade readiness is required for this content." />;
}

export function MemberFeatureGate({ allowed, children }: { allowed: boolean; children: ReactNode }) {
  return allowed ? <>{children}</> : <UpgradePrompt message="This feature is controlled by membership entitlements." />;
}

export function ProtectedMediaGate({ state, children }: { state: MemberAccessState; children: ReactNode }) {
  return <MemberAccessGate state={state}>{children}</MemberAccessGate>;
}
