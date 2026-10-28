import { useEffect, useRef, useState } from "react";
import { protectedMediaApiService } from "../../services/ProtectedMediaApiService";
import { authShellChangedEvent } from "../../../services/auth/AuthenticationShellService";

export function MemberProtectedAudioPlayer({ mediaId, releaseSlug, title }: { mediaId?: string; releaseSlug?: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<Awaited<ReturnType<typeof protectedMediaApiService.songUsage>> | null>(null);
  const operation = useRef(0);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const playbackSession = useRef<string | undefined>(undefined);
  const clearSource = () => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); }
    setSource("");
    playbackSession.current = undefined;
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
  };

  useEffect(() => {
    clearSource(); setUsage(null); setStatus("idle");
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
    const logout = () => { operation.current++; clearSource(); setUsage(null); setStatus("session_changed"); };
    const storage = (event: StorageEvent) => { if (event.key === authShellChangedEvent) logout(); };
    window.addEventListener(authShellChangedEvent, logout);
    window.addEventListener("storage", storage);
    return () => { operation.current++; controller.abort(); clearInterval(timer); if (expiryTimer.current) clearTimeout(expiryTimer.current); if (refreshTimer.current) clearTimeout(refreshTimer.current); window.removeEventListener(authShellChangedEvent, logout); window.removeEventListener("storage", storage); audioRef.current?.pause(); };
  }, [releaseSlug, mediaId]);

  const start = async () => {
    if (status === "authorizing") return;
    const requestId = ++operation.current;
    setError("");
    setStatus("authorizing");
    try {
      const authorization = releaseSlug
        ? await protectedMediaApiService.authorizeReleaseStream(releaseSlug, { component: "member_protected_audio_player" })
        : await protectedMediaApiService.authorizeStream(mediaId ?? "", { component: "member_protected_audio_player" });
      if (!authorization.streamEndpoint) throw new Error("No protected stream endpoint returned.");
      if (requestId !== operation.current) return;
      setSource(authorization.streamEndpoint);
      playbackSession.current = authorization.playbackSessionId;
      setStatus("ready");
      setTimeout(() => { if (requestId === operation.current) void audioRef.current?.play().catch(() => setStatus("ready")); }, 0);
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
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-white/50" role="status">{usage ? usage.mode === "unlimited" ? `Full streaming available · ${usage.streamStarts} starts` : usage.remainingFullPlays === 0 ? "Included play used" : usage.remainingFullPlays === 1 ? "1 included full play available" : "Full streaming unavailable" : status}</p>
        </div>
        <button disabled={status === "authorizing" || Boolean(usage && !usage.canStream) || Boolean(source)} className="rounded-md border border-cyanGlow/40 px-3 py-2 text-sm font-semibold text-cyanGlow disabled:opacity-50" onClick={start} type="button">
          Play full song
        </button>
      </div>
      {source ? <audio ref={audioRef} className="mt-4 w-full" controls preload="none" src={source} onEnded={() => { report("completed"); operation.current++; clearSource(); setStatus("completed"); }} onPause={() => report("paused")} onError={() => { report("failed"); operation.current++; clearSource(); setStatus("unavailable"); }} onPlay={() => { report("playing"); const current = operation.current; if (releaseSlug) void protectedMediaApiService.songUsage(releaseSlug).then((next) => { if (operation.current === current) setUsage(next); }).catch(() => undefined); }} /> : null}
      {error ? <p className="mt-3 text-sm text-rose-100">{error}</p> : null}
    </div>
  );
}
