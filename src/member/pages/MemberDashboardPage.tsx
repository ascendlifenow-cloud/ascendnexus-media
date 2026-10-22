import { ListMusic, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AudioPreviewPlayer } from "../../components/AudioPreviewPlayer";
import { Button } from "../../components/ui/Button";
import { memberEngagementApiService, cardToResource } from "../services/MemberEngagementApiService";
import type { MemberDashboardContentCard, MemberDashboardPlaylist } from "../services/memberPortalTypes";
import { useMemberPortal } from "../hooks/useMemberPortal";
import { usePublicAudioPlayer } from "../../hooks/public";
import { CardGrid, PageHeader, Panel } from "./memberPageParts";

function StreamingSongList({ title, items, empty, accent }: { title: string; items: MemberDashboardContentCard[]; empty: string; accent: "cyan" | "pink" }) {
  const player = usePublicAudioPlayer();
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
                {item.audioPreviewUrl ? (
                  <div className="space-y-2">
                    <AudioPreviewPlayer releaseId={item.contentId} title={item.title} artistName={item.subtitle || "Ascend Nexus Media"} audioPreviewUrl={item.audioPreviewUrl} compact />
                    <Button type="button" variant="ghost" size="sm" onClick={() => player.enqueue(
                      { releaseId: item.contentId, url: item.audioPreviewUrl! },
                      { releaseId: item.contentId, title: item.title, artistName: item.subtitle, coverArtUrl: item.imageUrl },
                    )}><ListMusic className="h-4 w-4" aria-hidden /> Add to streaming queue</Button>
                  </div>
                ) : <Link to={item.href} className="text-sm font-semibold text-cyanGlow">Open song</Link>}
              </div>
            </article>
          ))}
        </div>
      ) : <p className="py-8 text-sm text-white/52">{empty}</p>}
    </section>
  );
}

function AddToPlaylistButton({ item, playlists, onAdded }: { item: MemberDashboardContentCard; playlists: MemberDashboardPlaylist[]; onAdded: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const add = async (playlist: MemberDashboardPlaylist) => {
    setBusy(playlist.playlistId);
    setMessage("");
    try {
      await memberEngagementApiService.addPlaylistItem(playlist.playlistId, cardToResource(item));
      await onAdded();
      setMessage(`Added to ${playlist.name}`);
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add this song.");
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="relative">
      <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <Plus className="h-4 w-4" aria-hidden /> Add To Playlist
      </Button>
      {open ? (
        <div className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-52 overflow-y-auto rounded-md border border-white/15 bg-night p-2 shadow-2xl">
          {playlists.length ? playlists.map((playlist) => (
            <button key={playlist.playlistId} type="button" disabled={Boolean(busy)} onClick={() => void add(playlist)} className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm text-white/76 hover:bg-white/10 disabled:opacity-50">
              <span className="truncate">{playlist.name}</span><span className="ml-3 text-xs text-white/38">{playlist.itemCount}</span>
            </button>
          )) : <Link to="/member/playlists" className="block rounded px-3 py-2 text-sm font-semibold text-cyanGlow hover:bg-white/8">Create your first playlist</Link>}
        </div>
      ) : null}
      {message ? <p className="mt-2 text-xs text-white/58" role="status">{message}</p> : null}
    </div>
  );
}

function RecentReleaseGrid({ items, playlists, onAdded }: { items: MemberDashboardContentCard[]; playlists: MemberDashboardPlaylist[]; onAdded: () => Promise<void> }) {
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
            {item.audioPreviewUrl ? <AudioPreviewPlayer releaseId={item.contentId} title={item.title} artistName={item.subtitle || "Ascend Nexus Media"} audioPreviewUrl={item.audioPreviewUrl} compact /> : null}
            <AddToPlaylistButton item={item} playlists={playlists} onAdded={onAdded} />
          </div>
        </article>
      ))}
    </div>
  );
}

export function MemberDashboardPage() {
  const { dashboard, refreshDashboard } = useMemberPortal();
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
        <RecentReleaseGrid items={dashboard.recentReleases} playlists={dashboard.userPlaylists} onAdded={refreshDashboard} />
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
