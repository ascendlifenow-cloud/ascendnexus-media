import { useEffect, useRef, useState } from "react";
import { protectedMediaApiService } from "../../services/ProtectedMediaApiService";
import { authShellChangedEvent } from "../../../services/auth/AuthenticationShellService";
import { LoaderCircle, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { CoverArtImage } from "../../../components/media/CoverArtImage";

export function MemberProtectedAudioPlayer({ mediaId, releaseSlug, title, coverArtUrl, artistName }: { mediaId?: string; releaseSlug?: string; title: string; coverArtUrl?: string; artistName?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [usage, setUsage] = useState<Awaited<ReturnType<typeof protectedMediaApiService.songUsage>> | null>(null);
  const operation = useRef(0);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const playbackSession = useRef<string | undefined>(undefined);
  const clearSource = () => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); }
    setSource("");
    setPlaying(false);
    playbackSession.current = undefined;
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
  };

  useEffect(() => {
    clearSource(); setUsage(null); setStatus("idle"); setStarted(false); setPosition(0); setDuration(0);
    const controller = new AbortController();
    const refresh = async () => {
      if (!releaseSlug) return;
      try {
        const next = await protectedMediaApiService.songUsage(releaseSlug, controller.signal);
        if (!controller.signal.aborted) {
          setUsage(next);
          if (!next.canStream && !next.canContinue) clearSource();
        }
      } catch {
        if (!controller.signal.aborted) { clearSource(); setUsage(null); setStatus("unavailable"); }
      }
    };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 15000);
    const logout = () => { operation.current++; clearSource(); setUsage(null); setStarted(false); setStatus("session_changed"); };
    const storage = (event: StorageEvent) => { if (event.key === authShellChangedEvent) logout(); };
    window.addEventListener(authShellChangedEvent, logout);
    window.addEventListener("storage", storage);
    const audio = audioRef.current;
    return () => { operation.current++; controller.abort(); clearInterval(timer); if (expiryTimer.current) clearTimeout(expiryTimer.current); if (refreshTimer.current) clearTimeout(refreshTimer.current); window.removeEventListener(authShellChangedEvent, logout); window.removeEventListener("storage", storage); if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); } };
  }, [releaseSlug, mediaId]);

  useEffect(() => {
    if (source) void audioRef.current?.play().catch(() => setStatus("ready"));
  }, [source]);

  const start = async () => {
    if (status === "authorizing") return;
    const requestId = ++operation.current;
    setError("");
    setStatus("authorizing");
    try {
      const authorization = releaseSlug
        ? await protectedMediaApiService.authorizeReleaseStream(releaseSlug, { component: "member_protected_audio_player" })
        : await protectedMediaApiService.authorizeStream(mediaId ?? "", { component: "member_protected_audio_player" });
      if (!authorization.authorized || !authorization.streamEndpoint || !/^\/api\/member\/media\/stream\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(authorization.streamEndpoint)
        || !authorization.expiresAt || !Number.isFinite(Date.parse(authorization.expiresAt)) || Date.parse(authorization.expiresAt) <= Date.now()) throw new Error("No valid protected stream endpoint returned.");
      if (requestId !== operation.current) return;
      setSource(authorization.streamEndpoint);
      playbackSession.current = authorization.playbackSessionId;
      setStatus("ready");
      const schedule = (expiresAt: string) => {
        if (expiryTimer.current) clearTimeout(expiryTimer.current);
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        const remaining = Date.parse(expiresAt) - Date.now();
        expiryTimer.current = setTimeout(() => { operation.current++; clearSource(); setStatus("expired"); }, Math.max(0, remaining));
        if (authorization.refreshAllowed && remaining > 30000) refreshTimer.current = setTimeout(async () => {
          try { const refreshed = await protectedMediaApiService.refreshStream(authorization.streamEndpoint!); if (requestId === operation.current) schedule(refreshed.expiresAt); }
          catch { if (requestId === operation.current) { clearSource(); setStatus("access_changed"); } }
        }, Math.max(1000, remaining - 30000));
      };
      if (authorization.expiresAt) schedule(authorization.expiresAt);
    } catch (err) {
      if (requestId !== operation.current) return;
      setSource("");
      setStatus("denied");
      setError(err instanceof Error ? err.message : "Protected stream unavailable.");
    }
  };

  const report = (state: "playing" | "paused" | "completed" | "failed") => {
    const id = playbackSession.current;
    if (id) void protectedMediaApiService.playbackState(id, state).catch(() => undefined);
  };

  return (
    <div className="min-w-0">
      <div className="relative isolate aspect-square w-full overflow-hidden rounded-md bg-black/30">
        <CoverArtImage src={coverArtUrl} title={title} artistName={artistName} size="hero" priority alt={`${title} cover art`} className="h-full w-full" />
        {started && usage ? <>
          {usage.remainingFullPlays !== null ? <span title="Included full plays remaining" className="absolute left-3 top-3 rounded-full border border-white/30 bg-black/85 px-3 py-2 text-xs font-semibold text-white" role="status">{usage.remainingFullPlays} left</span> : null}
          <span title="Your server-recorded playback starts, not completed listens" className="absolute right-3 top-3 rounded-full border border-white/30 bg-black/85 px-3 py-2 text-xs font-semibold text-white" role="status">{usage.streamStarts} played</span>
        </> : null}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <button type="button" title={muted ? "Unmute" : "Mute"} aria-label={muted ? "Unmute" : "Mute"} aria-pressed={muted} onClick={() => setMuted((value) => !value)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-black/85 text-white shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
            {muted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
          </button>
          <button type="button" title={playing ? "Pause full song" : source ? "Resume full song" : "Play full song"} aria-label={playing ? "Pause full song" : source ? "Resume full song" : "Play full song"}
            disabled={status === "authorizing" || (!source && Boolean(usage && !usage.canStream))}
            onClick={() => { if (!source) void start(); else if (playing) audioRef.current?.pause(); else void audioRef.current?.play().catch(() => setError("Playback could not start. Please try again.")); }}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-black/85 text-white shadow-lg transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-50">
            {status === "authorizing" ? <LoaderCircle className="h-6 w-6 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : playing ? <Pause className="h-6 w-6" aria-hidden="true" /> : <Play className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>
      </div>
      <audio ref={audioRef} preload="none" muted={muted} src={source || undefined}
        onLoadedMetadata={() => setDuration(Number.isFinite(audioRef.current?.duration) ? audioRef.current!.duration : 0)}
        onTimeUpdate={() => setPosition(audioRef.current?.currentTime ?? 0)}
        onEnded={() => { report("completed"); operation.current++; clearSource(); setStatus("completed"); }}
        onPause={() => { setPlaying(false); report("paused"); }}
        onError={() => { if (!source) return; report("failed"); operation.current++; clearSource(); setStatus("unavailable"); setError("Full song playback is unavailable. Please retry; contact support if it continues."); }}
        onPlaying={() => { setPlaying(true); setStarted(true); report("playing"); const current = operation.current; if (releaseSlug) void protectedMediaApiService.songUsage(releaseSlug).then((next) => { if (operation.current === current) setUsage(next); }).catch(() => undefined); }} />
      {source ? <label className="mt-3 flex items-center gap-3 text-xs text-white/70"><span>Seek</span><input aria-label="Song playback position" className="min-w-0 flex-1 accent-cyan-300" type="range" min={0} max={duration || 0} step={0.1} value={Math.min(position, duration)} disabled={!duration} onChange={(event) => { if (audioRef.current) audioRef.current.currentTime = Number(event.target.value); setPosition(Number(event.target.value)); }} /></label> : null}
      <p className="mt-3 text-xs text-white/70" role="status">{usage ? usage.mode === "unlimited" ? "Unlimited full-song streaming" : usage.remainingFullPlays === 0 ? "Included play used" : usage.remainingFullPlays === 1 ? "1 included full play available" : "Full streaming unavailable" : status === "unavailable" ? "Sign in to check full-song access" : status.replace(/_/g, " ")}</p>
      {error ? <p className="mt-3 text-sm text-rose-100">{error}</p> : null}
    </div>
  );
}
