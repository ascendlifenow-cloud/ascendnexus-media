import { Link } from "react-router-dom";
import { useMemberPortal } from "../hooks/useMemberPortal";
import { CardGrid, PageHeader, Panel, ReadinessPanel } from "./memberPageParts";

export function MemberDashboardPage() {
  const { dashboard } = useMemberPortal();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Member dashboard" title={`Welcome, ${dashboard.welcome.displayName}`}>
        {dashboard.welcome.greeting}
      </PageHeader>
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Membership">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-semibold text-white">{dashboard.membership?.name ?? "Free Member"}</p>
              <p className="mt-2 text-sm text-white/58">{dashboard.membershipCta.message}</p>
            </div>
            <Link to={dashboard.membershipCta.href} className="rounded-md bg-cyanGlow px-4 py-2 text-sm font-semibold text-night">{dashboard.membershipCta.label}</Link>
          </div>
        </Panel>
        <Panel title="Capabilities">
          <div className="space-y-3">
            {dashboard.capabilities.slice(0, 4).map((capability) => <p key={capability.category} className="text-sm text-white/68"><span className="font-semibold text-white">{capability.category}:</span> {capability.label}</p>)}
          </div>
        </Panel>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReadinessPanel summary={dashboard.continueListening} />
        <ReadinessPanel summary={dashboard.followedArtists} />
        <ReadinessPanel summary={dashboard.favorites} />
        <ReadinessPanel summary={dashboard.playlists} />
      </section>
      <Panel title="Recently released">
        <CardGrid items={dashboard.recentReleases} empty="No published releases are visible to this membership yet." />
      </Panel>
      <Panel title="Recommended for you">
        <CardGrid items={dashboard.recommendations} empty="Recommendations are unavailable, so recent public releases will appear here when published." />
      </Panel>
      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Early access">
          <CardGrid items={dashboard.earlyAccess} empty="No early-access releases are currently available to this membership." />
        </Panel>
        <Panel title="Exclusive content">
          <CardGrid items={dashboard.exclusiveContent} empty="Exclusive content appears here only when your current entitlements allow it." />
        </Panel>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Member galleries">
          <CardGrid items={dashboard.memberGalleries} empty="Member gallery content is empty right now." />
        </Panel>
        <Panel title="Announcements">
          <CardGrid items={dashboard.announcements} empty="No member announcements are active." />
        </Panel>
      </section>
    </div>
  );
}
