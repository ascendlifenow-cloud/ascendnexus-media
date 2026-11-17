import { ListPlus } from "lucide-react";
import { useContext, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { memberEngagementApiService } from "../../services/MemberEngagementApiService";
import { ActionTooltip } from "../../../components/ui/ActionTooltip";
import { MemberPortalContext } from "../../contexts/MemberPortalContext";
import { authShellChangedEvent } from "../../../services/auth/AuthenticationShellService";

interface PlaylistSummary { playlistId: string; name: string; items?: unknown[] }
export interface PlaylistReleaseReference {
  releaseId: string;
  title: string;
  slug?: string;
  coverArtUrl?: string;
  coverArtThumbnailUrl?: string;
}

export function AddReleaseToPlaylistButton({ release, compact = false, className, placement = "below" }: { release: PlaylistReleaseReference; compact?: boolean; className?: string; placement?: "above" | "below" }) {
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const portal = useContext(MemberPortalContext);
  const operation = useRef(0);
  const busy = useRef(false);
  const controller = useRef<AbortController | undefined>(undefined);
  const trigger = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  useEffect(() => {
    const clear = () => { operation.current++; controller.current?.abort(); busy.current = false; setOpen(false); setPlaylists([]); setMessage(""); setLoading(false); };
    const storage = (event: StorageEvent) => { if (event.key === authShellChangedEvent || event.key === null) clear(); };
    clear();
    window.addEventListener(authShellChangedEvent, clear);
    window.addEventListener("storage", storage);
    return () => { operation.current++; controller.current?.abort(); busy.current = false; window.removeEventListener(authShellChangedEvent, clear); window.removeEventListener("storage", storage); };
  }, [release.releaseId, portal?.session.member.memberId]);

  const toggle = async () => {
    if (open) return setOpen(false);
    if (busy.current) return;
    busy.current = true;
    const requestId = ++operation.current;
    controller.current = new AbortController();
    const signal = AbortSignal.any([controller.current.signal, AbortSignal.timeout(15000)]);
    setOpen(true);
    setMessage("");
    setPlaylists([]);
    setLoading(true);
    try {
      const next = await memberEngagementApiService.playlists(signal) as unknown as PlaylistSummary[];
      if (requestId === operation.current) setPlaylists(next);
    } catch {
      if (requestId === operation.current) setMessage("Could not load playlists. Check your member session and try again.");
    } finally {
      if (requestId === operation.current) { busy.current = false; setLoading(false); }
    }
  };

  const add = async (playlist: PlaylistSummary) => {
    if (busy.current) return;
    busy.current = true;
    const requestId = ++operation.current;
    controller.current = new AbortController();
    const signal = AbortSignal.any([controller.current.signal, AbortSignal.timeout(15000)]);
    setLoading(true);
    try {
      await memberEngagementApiService.addPlaylistItem(playlist.playlistId, {
        resourceType: "release",
        resourceId: release.releaseId,
        title: release.title,
        slug: release.slug,
        imageUrl: release.coverArtThumbnailUrl ?? release.coverArtUrl,
      }, signal);
      if (requestId !== operation.current) return;
      setMessage(`Added to ${playlist.name}`);
      setOpen(false);
      trigger.current?.querySelector("button")?.focus();
      // A successful save must not be reported as failed if only the dashboard refresh fails.
      void portal?.refreshDashboard().catch(() => {
        if (requestId === operation.current) setMessage(`Added to ${playlist.name}. Refresh the page to update your lists.`);
      });
    } catch (error) {
      if (requestId === operation.current) setMessage(error instanceof Error ? error.message : "Could not add this song.");
    } finally {
      if (requestId === operation.current) { busy.current = false; setLoading(false); }
    }
  };

  return (
    <div ref={trigger} className="group/action relative shrink-0" onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); trigger.current?.querySelector("button")?.focus(); } }}>
      <Button type="button" variant="secondary" size="icon" className={className} onClick={() => void toggle()} disabled={loading} aria-expanded={open} aria-controls={open ? panelId : undefined} aria-label={loading ? "Loading playlists" : "Add to playlist"}>
        <ListPlus className="h-4 w-4" aria-hidden="true" />
        <ActionTooltip label={loading ? "Loading playlists" : "Add to playlist"} />
      </Button>
      {open ? (
        <div id={panelId} role="group" aria-label="Choose a playlist" aria-busy={loading} className={placement === "above"
          ? "fixed bottom-[var(--member-song-player-bottom,12rem)] left-3 z-[120] max-h-[calc(100dvh-var(--member-song-player-bottom,12rem)-0.75rem)] w-[min(20rem,calc(100vw-1.5rem))] overflow-y-auto rounded-md border border-white/15 bg-night p-2 shadow-2xl"
          : "absolute left-0 top-full z-30 mt-2 min-w-64 rounded-md border border-white/15 bg-night p-2 shadow-2xl"}>
          {playlists.map((playlist) => (
            <button key={playlist.playlistId} type="button" disabled={loading} onClick={() => void add(playlist)} className="block min-h-11 w-full break-words rounded px-3 py-2 text-left text-sm text-white/76 hover:bg-white/10 disabled:opacity-50">
              {playlist.name}
            </button>
          ))}
          {loading ? <p role="status" className="px-3 py-2 text-sm text-white/70">Loading...</p> : null}
          {!loading && playlists.length === 0 ? <Link to="/member/playlists" className="block rounded px-3 py-2 text-sm font-semibold text-cyanGlow">Open member playlists</Link> : null}
        </div>
      ) : null}
      {message ? <p className="mt-2 text-xs text-white/58" role="status">{message}</p> : null}
    </div>
  );
}
