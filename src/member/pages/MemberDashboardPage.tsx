import { ListMusic, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { SongPlaybackActions } from "../../components/songs/SongPlaybackActions";
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
        <div className="divide-y divide-white/8">
          {items.map((item, index) => (
            <article key={`${item.contentId}-${index}`} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 py-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_minmax(12rem,0.8fr)] sm:items-center">
              <Link to={item.href} className="block aspect-square overflow-hidden rounded-md bg-white/8">
                {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : null}
              </Link>
              <div className="min-w-0">
                <Link to={item.href} className="block truncate font-semibold text-white hover:text-cyanGlow">{item.title}</Link>
                <p className="mt-1 truncate text-xs text-white/48">{item.subtitle || item.accessLabel}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <SongPlaybackActions compact release={{ releaseId: item.contentId, title: item.title, slug: item.href.split("/").pop(), artistName: item.subtitle, coverArtUrl: item.imageUrl, audioPreviewUrl: item.audioPreviewUrl }} />
              </div>
            </article>
          ))}
        </div>
      ) : <p className="py-8 text-sm text-white/52">{empty}</p>}
    </section>
  );
}

function RecentReleaseGrid({ items }: { items: MemberDashboardContentCard[] }) {
  if (!items.length) return <p className="rounded-md border border-white/10 bg-black/20 p-4 text-sm text-white/58">No published releases are visible to this membership yet.</p>;
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.contentId} className="overflow-hidden rounded-md border border-white/10 bg-black/24">
          <Link to={item.href} className="group relative block aspect-square overflow-hidden bg-white/8">
            {item.imageUrl ? <img src={item.imageUrl} alt={`${item.title} cover art`} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent" />
            <h3 className="absolute inset-x-4 bottom-4 text-xl font-semibold leading-tight text-white">{item.title}</h3>
          </Link>
          <div className="space-y-3 p-4">
            <SongPlaybackActions compact release={{ releaseId: item.contentId, title: item.title, slug: item.href.split("/").pop(), artistName: item.subtitle, coverArtUrl: item.imageUrl, audioPreviewUrl: item.audioPreviewUrl }} />
          </div>
        </article>
      ))}
    </div>
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
