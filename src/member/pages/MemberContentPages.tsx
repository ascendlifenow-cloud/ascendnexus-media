import { useEffect, useState } from "react";
import { memberDashboardApiService } from "../services/MemberDashboardApiService";
import type { MemberDashboardContentCard } from "../services/memberPortalTypes";
import { useMemberPortal } from "../hooks/useMemberPortal";
import { CardGrid, PageHeader, Panel, ReadinessPanel } from "./memberPageParts";

export function MemberRecommendationsPage() {
  const { dashboard } = useMemberPortal();
  const [items, setItems] = useState<MemberDashboardContentCard[]>(dashboard.recommendations);
  useEffect(() => { void memberDashboardApiService.recommendations().then((result) => setItems(result.items)); }, []);
  return <ContentListPage eyebrow="Recommendations" title="Recommended for you" description="Editorial and new-release recommendations filtered by current access." items={items} empty="Recommendations are unavailable right now." />;
}

export function MemberEarlyAccessPage() {
  const { dashboard } = useMemberPortal();
  const [items, setItems] = useState<MemberDashboardContentCard[]>(dashboard.earlyAccess);
  useEffect(() => { void memberDashboardApiService.earlyAccess().then((result) => setItems(result.items)); }, []);
  return <ContentListPage eyebrow="Early access" title="Early-access releases" description="Server time and current membership determine what appears here." items={items} empty="No early-access content is currently available for this membership." />;
}

export function MemberExclusiveContentPage() {
  const { dashboard } = useMemberPortal();
  const [items, setItems] = useState<MemberDashboardContentCard[]>(dashboard.exclusiveContent);
  useEffect(() => { void memberDashboardApiService.exclusiveContent().then((result) => setItems(result.items)); }, []);
  return <ContentListPage eyebrow="Exclusive content" title="Exclusive content" description="Exclusive songs, videos, artwork, and galleries appear only after access evaluation." items={items} empty="No exclusive content is currently available for this membership." />;
}

function ContentListPage({ eyebrow, title, description, items, empty }: { eyebrow: string; title: string; description: string; items: MemberDashboardContentCard[]; empty: string }) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title}>{description}</PageHeader>
      <Panel>
        <CardGrid items={items} empty={empty} />
      </Panel>
    </div>
  );
}

export function MemberReadinessPage({ feature }: { feature: "favorites" | "following" | "history" | "playlists" | "notifications" }) {
  const { dashboard } = useMemberPortal();
  const summary = feature === "following" ? dashboard.followedArtists : dashboard[feature];
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Feature readiness" title={summary.label}>{summary.message}</PageHeader>
      <ReadinessPanel summary={summary} />
    </div>
  );
}

export function MemberAccountStatePage({ state }: { state: "verification" | "expired" | "suspended" | "session-expired" }) {
  const copy = {
    verification: ["Verification required", "Verify your email to unlock the full member experience."],
    expired: ["Membership expired", "Your account can continue with free access where policy allows."],
    suspended: ["Account suspended", "Protected member content is unavailable for this account state."],
    "session-expired": ["Session expired", "Please sign in again to continue."],
  } as const;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Account state" title={copy[state][0]}>{copy[state][1]}</PageHeader>
      <Panel><p className="text-sm leading-6 text-white/62">No protected content is rendered while this state is active.</p></Panel>
    </div>
  );
}
