import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { LoaderCircle, Pause, Play, X } from "lucide-react";
import { SongPlaybackActions } from "../../../components/songs/SongPlaybackActions";
import { usePublicAudioPlayer } from "../../../hooks/public";
import { CoverArtImage } from "../../../components/media/CoverArtImage";
import type { MemberDashboardContentCard } from "../../services/memberPortalTypes";
import { authShellChangedEvent } from "../../../services/auth/AuthenticationShellService";

const SelectionContext = createContext<{ selected: MemberDashboardContentCard | null; select: (item: MemberDashboardContentCard) => void } | null>(null);
export const useMemberSongSelection = () => useContext(SelectionContext);
export const songActionRelease = (item: MemberDashboardContentCard) => ({
  releaseId: item.contentId, title: item.title, slug: item.href.split("/").filter(Boolean).pop(),
  artistName: item.subtitle, coverArtUrl: item.imageUrl, audioPreviewUrl: item.audioPreviewUrl,
});

export function MemberSongSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, select] = useState<MemberDashboardContentCard | null>(null);
  const [mode, setMode] = useState<"preview" | "full">("full");
  const location = useLocation();
  const player = usePublicAudioPlayer();
  useEffect(() => select(null), [location.pathname]);
  useEffect(() => {
    const clear = () => select(null);
    window.addEventListener(authShellChangedEvent, clear);
    return () => window.removeEventListener(authShellChangedEvent, clear);
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty("--member-song-player-bottom", selected ? "12rem" : "0.75rem");
    return () => { document.documentElement.style.removeProperty("--member-song-player-bottom"); };
  }, [selected]);
  const active = selected && player.activeRelease?.releaseId === selected.contentId && player.playbackMode === mode;
  const busy = active && ["loading", "buffering"].includes(player.status);
  const playing = active && player.status === "playing";
  const play = () => {
    if (!selected) return;
    if (active && player.source && !["error", "unavailable"].includes(player.status)) void player.toggle();
    else if (mode === "preview" && selected.audioPreviewUrl) void player.playPreview({ releaseId: selected.contentId, url: selected.audioPreviewUrl }, songActionRelease(selected));
    else if (mode === "full") void player.playQueued({ releaseId: selected.contentId, url: selected.audioPreviewUrl ?? "" }, songActionRelease(selected));
  };
  return <SelectionContext.Provider value={{ selected, select }}>
    {children}
    {selected && createPortal(<aside aria-label="Selected song actions" className="fixed bottom-3 left-3 z-[110] w-[min(24rem,calc(100vw-1.5rem))] rounded-md border border-cyan-300/30 bg-[#10131d] p-3 text-white shadow-2xl">
      <div className="mb-2 flex items-start gap-3">
        <div className="min-w-0 flex-1"><p className="truncate font-semibold">{selected.title}</p><p className="truncate text-xs text-white/60">{selected.subtitle}</p></div>
        <button type="button" title="Close song actions" aria-label="Close song actions" onClick={() => select(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/10"><X className="h-4 w-4" aria-hidden /></button>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-md border border-white/15 p-1" role="group" aria-label="Playback mode">
        {(["preview", "full"] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}
          disabled={value === "preview" && !selected.audioPreviewUrl}
          className={`min-h-9 rounded px-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-40 ${mode === value ? "bg-cyan-300/20 text-white" : "text-white/60 hover:bg-white/5"}`}>
          {value === "preview" ? "Preview · 30 sec" : "Full Song"}
        </button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" title={`${playing ? "Pause" : "Play"} ${mode === "full" ? "full song" : "preview"}`} aria-label={`${playing ? "Pause" : "Play"} ${mode === "full" ? "full song" : "preview"}`} disabled={Boolean(busy) || (mode === "preview" && !selected.audioPreviewUrl)} onClick={play}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-60">
          {busy ? <LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden /> : playing ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}
        </button>
        <SongPlaybackActions key={selected.contentId} compact hidePreview release={songActionRelease(selected)} detailsTo={selected.href} playlistPlacement="above" />
      </div>
      {active && player.error ? <p role="alert" className="mt-2 text-xs text-rose-100">{player.error.message}</p> : null}
      {busy ? <p role="status" className="mt-2 text-xs text-white/70">Preparing playback...</p> : null}
    </aside>, document.body)}
  </SelectionContext.Provider>;
}

export function MemberSongTile({ item }: { item: MemberDashboardContentCard }) {
  const selection = useContext(SelectionContext);
  const selected = selection?.selected?.contentId === item.contentId;
  return <button type="button" aria-label={`Select ${item.title}`} aria-pressed={selected} onClick={() => selection?.select(item)}
    className={`group min-w-0 w-full rounded-md p-1 text-left transition motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${selected ? "bg-cyan-300/10 ring-2 ring-cyan-300/70" : "hover:bg-white/5"}`}>
    <div className="aspect-square w-full overflow-hidden rounded-md bg-white/5">
      <CoverArtImage src={item.imageUrl} title={item.title} artistName={item.subtitle} size="card" alt={`${item.title} cover art`} className="h-full w-full" />
    </div>
    <span className="mt-2 block break-words text-sm font-semibold text-white">{item.title}</span>
  </button>;
}
