import { ListMusic, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { MemberDashboardContentCard } from "../services/memberPortalTypes";
import { useMemberPortal } from "../hooks/useMemberPortal";
import { CardGrid, PageHeader, Panel } from "./memberPageParts";

function StreamingSongList({ title, items, empty, accent }: { title: string; items: MemberDashboardContentCard[]; empty: string; accent: "cyan" | "pink" }) {
  return (
    <section className="min-w-0 border-t border-white/10 pt-4">
      <div className="mb-4 flex items-center gap-3">
        {accent === "cyan" ? <ListMusic className="h-5 w-5 text-cyanGlow" aria-hidden /> : <Sparkles className="h-5 w-5 text-anm-pink" aria-hidden />}
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      {items.length ? (
        <CardGrid items={items} empty={empty} />
      ) : <p className="py-8 text-sm text-white/52">{empty}</p>}
    </section>
  );
}

function RecentReleaseGrid({ items }: { items: MemberDashboardContentCard[] }) {
  if (!items.length) return <p className="rounded-md border border-white/10 bg-black/20 p-4 text-sm text-white/58">No published releases are visible to this membership yet.</p>;
  return (
    <CardGrid items={items} empty="No recent releases available." />
  );
}

export function MemberDashboardPage() {
  const { dashboard } = useMemberPortal();
  const listeningItems = dashboard.continueListeningItems.length ? dashboard.continueListeningItems : dashboard.curatedPlaylist;
  const listeningTitle = dashboard.continueListeningItems.length ? "Continue Listening" : "Your Curated Listening Queue";
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Member listening hub" title={`Welcome, ${dashboard.welcome.displayName}`}>
        Pick up where you left off, explore a curated queue, or build your own playlists.
      </PageHeader>
      <section className="grid gap-8 lg:grid-cols-2">
        <StreamingSongList title={listeningTitle} items={listeningItems} empty="Play a song and your listening queue will begin here." accent="cyan" />
        <StreamingSongList title="Recommended Playlist" items={dashboard.curatedPlaylist} empty="Recommendations will appear as releases become available." accent="pink" />
      </section>
      <Panel title="Recently Released">
        <RecentReleaseGrid items={dashboard.recentReleases} />
      </Panel>
      {dashboard.userPlaylists.length ? (
        <Panel title="Your Playlists">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dashboard.userPlaylists.map((playlist) => (
              <Link key={playlist.playlistId} to="/member/playlists" className="rounded-md border border-white/10 bg-black/20 p-4 transition hover:border-cyanGlow/40">
                <p className="font-semibold text-white">{playlist.name}</p>
                <p className="mt-2 text-sm text-white/52">{playlist.itemCount} song{playlist.itemCount === 1 ? "" : "s"}</p>
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}
      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Early Access"><CardGrid items={dashboard.earlyAccess} empty="No early-access releases are currently available." /></Panel>
        <Panel title="Exclusive Content"><CardGrid items={dashboard.exclusiveContent} empty="Exclusive releases appear here when your membership allows them." /></Panel>
      </section>
    </div>
  );
}
