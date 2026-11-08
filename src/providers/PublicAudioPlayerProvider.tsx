import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PublicAudioPlayerContext, type PublicAudioPlayerContextValue } from "../contexts/PublicAudioPlayerContext";
import { publicAudioSourceSelectionService } from "../services/audio/PublicAudioSourceSelectionService";
import { publicAudioPreviewValidationService } from "../services/audio/PublicAudioPreviewValidationService";
import { transitionAudioState } from "../state/audio/AudioPlaybackStateMachine";
import type {
  BufferedRange,
  PublicAudioPlaybackStatus,
  PublicAudioPlayerState,
  PublicAudioPreviewContract,
  PublicAudioReleaseSummary,
} from "../state/audio/audioPlayerTypes";
import { clampAudioTime } from "../utils/audio/audioTimeUtils";
import { createAudioPlaybackError, mapMediaError } from "../utils/audio/audioErrorUtils";
import { protectedMediaApiService } from "../member/services/ProtectedMediaApiService";
import { authShellChangedEvent } from "../services/auth/AuthenticationShellService";

const initialState: PublicAudioPlayerState = {
  status: "idle",
  currentTime: 0,
  duration: 0,
  bufferedRanges: [],
  volume: 1,
  muted: false,
  version: 0,
};

const getBufferedRanges = (audio: HTMLAudioElement): BufferedRange[] => {
  const ranges: BufferedRange[] = [];
  for (let index = 0; index < audio.buffered.length; index += 1) {
    ranges.push({ start: audio.buffered.start(index), end: audio.buffered.end(index) });
  }
  return ranges;
};

export function PublicAudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef<PublicAudioPlayerState>(initialState);
  const [state, setState] = useState<PublicAudioPlayerState>(initialState);
  const [playbackMode, setPlaybackMode] = useState<"preview" | "full">("preview");
  const [protectedUsage, setProtectedUsage] = useState<PublicAudioPlayerContextValue["protectedUsage"]>(undefined);
  const protectedStarted = useRef(false);
  const usageRequest = useRef(0);
  const operation = useRef(0);
  const protectedSession = useRef<{ expiresAt: number; sessionId?: string } | undefined>(undefined);
  const protectedTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queuedRequest = useRef<{ preview: PublicAudioPreviewContract; release: PublicAudioReleaseSummary } | undefined>(undefined);
  const cancelProtected = useCallback(() => {
    operation.current++;
    usageRequest.current++;
    protectedStarted.current = false;
    setProtectedUsage(undefined);
    protectedSession.current = undefined;
    protectedTimers.current.forEach(clearTimeout);
    protectedTimers.current = [];
    clearTimeout(pollTimer.current);
  }, []);
  const [queue, setQueue] = useState<Array<{ preview: PublicAudioPreviewContract; release: PublicAudioReleaseSummary }>>([]);
  const queueRef = useRef<Array<{ preview: PublicAudioPreviewContract; release: PublicAudioReleaseSummary }>>([]);

  const updateQueue = useCallback((next: Array<{ preview: PublicAudioPreviewContract; release: PublicAudioReleaseSummary }>) => {
    queueRef.current = next;
    setQueue(next);
  }, []);

  const enqueue = useCallback((preview: PublicAudioPreviewContract, release: PublicAudioReleaseSummary) => {
    if (queueRef.current.some((item) => item.release.releaseId === release.releaseId)) return;
    updateQueue([...queueRef.current, { preview, release }]);
  }, [updateQueue]);

  const removeFromQueue = useCallback((releaseId: string) => {
    updateQueue(queueRef.current.filter((item) => item.release.releaseId !== releaseId));
  }, [updateQueue]);

  const clearQueue = useCallback(() => updateQueue([]), [updateQueue]);

  const updateState = useCallback((patch: Partial<PublicAudioPlayerState> | ((current: PublicAudioPlayerState) => Partial<PublicAudioPlayerState>)) => {
    const current = stateRef.current;
    const resolvedPatch = typeof patch === "function" ? patch(current) : patch;
    const next = { ...current, ...resolvedPatch };
    stateRef.current = next;
    setState(next);
  }, []);

  const setStatus = useCallback((status: PublicAudioPlaybackStatus, lastEvent?: string) => {
    updateState((current) => ({ status: transitionAudioState(current.status, status), lastEvent }));
  }, [updateState]);

  const clearMediaSession = useCallback(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    }
  }, []);

  const updateMediaSession = useCallback((release?: PublicAudioReleaseSummary) => {
    if (!release || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: release.title,
      artist: release.artistName ?? "Ascend Nexus Media",
      artwork: release.coverArtUrl ? [{ src: release.coverArtUrl, sizes: "512x512" }] : undefined,
    });
  }, []);

  const stop = useCallback(() => {
    cancelProtected();
    queuedRequest.current = undefined;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    clearMediaSession();
    updateState((current) => ({
      status: "idle",
      activePreview: undefined,
      activeRelease: undefined,
      source: undefined,
      currentTime: 0,
      duration: 0,
      bufferedRanges: [],
      error: undefined,
      lastEvent: "stop",
      version: current.version + 1,
    }));
  }, [cancelProtected, clearMediaSession, updateState]);

  const clear = stop;

  const refreshUsage = useCallback(async (release: PublicAudioReleaseSummary) => {
    const generation = operation.current;
    const request = ++usageRequest.current;
    try {
      const usage = await protectedMediaApiService.songUsage(release.slug || release.releaseId, AbortSignal.timeout(10000));
      if (generation !== operation.current || request !== usageRequest.current) return;
      if (!usage.canContinue) throw new Error("Access changed");
      // These are delivery starts and remaining allowances, never completed listens.
      if (protectedStarted.current) {
        const validCount = (count: number) => Number.isSafeInteger(count) && count >= 0;
        if (!validCount(usage.streamStarts) || (usage.remainingFullPlays !== null && !validCount(usage.remainingFullPlays))) throw new Error("Invalid usage");
        setProtectedUsage({ releaseId: release.releaseId, streamStarts: usage.streamStarts, remainingFullPlays: usage.remainingFullPlays });
      }
    } catch {
      if (generation !== operation.current || request !== usageRequest.current) return;
      stop();
      updateState({ status: "unavailable", activeRelease: release, error: createAudioPlaybackError("AUDIO_SOURCE_LOAD_FAILED", "Full-song access could not be verified. Select the queued song to try again.", false) });
    }
  }, [stop, updateState]);

  const play = useCallback(async () => {
    if (protectedSession.current && Date.now() >= protectedSession.current.expiresAt) {
      stop();
      updateState({ status: "unavailable", error: createAudioPlaybackError("AUDIO_SOURCE_LOAD_FAILED", "Full-song access expired. Select the queued song to authorize again.", false) });
      return;
    }
    const audio = audioRef.current;
    if (!audio || !stateRef.current.source) {
      updateState({ status: "unavailable", error: createAudioPlaybackError("AUDIO_PREVIEW_NOT_AVAILABLE", "No public audio preview is available.", false) });
      return;
    }
    try {
      setStatus("loading", "play_requested");
      await audio.play();
    } catch (error) {
      const blocked = error instanceof DOMException && error.name === "NotAllowedError";
      updateState({
        status: blocked ? "blocked" : "error",
        error: createAudioPlaybackError(blocked ? "AUDIO_PLAYBACK_BLOCKED" : "AUDIO_SOURCE_LOAD_FAILED", blocked ? "Playback needs a direct user action." : "The audio preview could not start.", !blocked, {
          releaseId: stateRef.current.activeRelease?.releaseId,
          previewVersion: stateRef.current.activePreview?.version,
        }),
        lastEvent: "play_rejected",
      });
    }
  }, [setStatus, stop, updateState]);

  const loadPreview = useCallback(async (preview: PublicAudioPreviewContract, release: PublicAudioReleaseSummary, options: { autoplay?: boolean; sourceContext?: string } = {}) => {
    stop();
    setPlaybackMode("preview");
    const validation = publicAudioPreviewValidationService.validatePreview(preview);
    const source = publicAudioSourceSelectionService.selectPreferredSource(preview);
    if (!validation.valid || !source) {
      updateState((current) => ({
        status: "unavailable",
        activePreview: preview,
        activeRelease: release,
        source: undefined,
        error: createAudioPlaybackError("AUDIO_SOURCE_INVALID", validation.blockingIssues[0] ?? "Audio preview is not available.", false, {
          releaseId: release.releaseId,
          previewVersion: preview.version,
        }),
        lastEvent: "validation_failed",
        version: current.version + 1,
      }));
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    if (stateRef.current.source !== source) {
      audio.pause();
      audio.src = source;
      audio.preload = "metadata";
      audio.crossOrigin = "anonymous";
      audio.load();
    }
    updateMediaSession(release);
    updateState((current) => ({
      status: "loading",
      activePreview: preview,
      activeRelease: release,
      source,
      currentTime: 0,
      duration: preview.durationSeconds ?? 0,
      bufferedRanges: [],
      error: undefined,
      lastEvent: options.sourceContext ?? "load_preview",
      version: current.version + 1,
    }));
    if (options.autoplay) await play();
  }, [play, stop, updateMediaSession, updateState]);

  const playQueued = useCallback(async (preview: PublicAudioPreviewContract, release: PublicAudioReleaseSummary) => {
    stop();
    queuedRequest.current = { preview, release };
    const requestId = operation.current;
    const current = () => requestId === operation.current;
    setPlaybackMode("full");
    updateState({ status: "loading", activeRelease: release, lastEvent: "queue_authorizing" });
    const fail = () => {
      if (!current()) return;
      stop();
      setPlaybackMode("full");
      updateState({ status: "unavailable", activeRelease: release, error: createAudioPlaybackError("AUDIO_SOURCE_LOAD_FAILED", "Full-song access could not be verified. Select the queued song to try again, or use the explicit preview button.", false) });
    };
    try {
      // Only an explicit unauthenticated response selects guest preview playback.
      const base = String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
      const response = await fetch(`${base}/api/auth/session`, { credentials: "include", cache: "no-store", headers: { "X-Auth-Scope": "member" }, signal: AbortSignal.timeout(10000) });
      if (!current()) return;
      if (response.status === 401) {
        await loadPreview(preview, release, { autoplay: true, sourceContext: "guest_streaming_queue" });
        return;
      }
      const identity = await response.json();
      if (!response.ok || identity.success !== true || identity.data?.authenticated !== true) throw new Error("Session unavailable");
      const authorization = await protectedMediaApiService.authorizeReleaseStream(release.slug || release.releaseId, { component: "streaming_queue" });
      if (!current()) return;
      const endpoint = authorization.streamEndpoint;
      // Protected delivery is deliberately separate from public preview URL validation.
      // Accept only the server gateway's opaque, same-origin authorization reference.
      if (!authorization.authorized || !endpoint || !/^\/api\/member\/media\/stream\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(endpoint)
        || !authorization.expiresAt || !publicAudioSourceSelectionService.canPlayMimeType(authorization.mimeType)) throw new Error("Invalid protected source");
      const schedule = (expiresAt: string) => {
        const expires = Date.parse(expiresAt);
        const remaining = expires - Date.now();
        if (!Number.isFinite(expires) || remaining <= 0) throw new Error("Expired access");
        protectedTimers.current.forEach(clearTimeout);
        protectedTimers.current = [];
        protectedSession.current = { expiresAt: expires, sessionId: authorization.playbackSessionId };
        protectedTimers.current.push(setTimeout(fail, remaining));
        if (authorization.refreshAllowed) protectedTimers.current.push(setTimeout(() => {
          void protectedMediaApiService.refreshStream(endpoint).then((result) => { if (current()) schedule(result.expiresAt); }).catch(fail);
        }, Math.max(1000, remaining - Math.min(30000, remaining / 2))));
      };
      schedule(authorization.expiresAt);
      const poll = async () => {
        await refreshUsage(release);
        if (current()) pollTimer.current = setTimeout(() => { void poll(); }, 15000);
      };
      pollTimer.current = setTimeout(() => { void poll(); }, 15000);
      const audio = audioRef.current;
      if (!audio) { fail(); return; }
      audio.src = endpoint;
      audio.preload = "metadata";
      audio.load();
      updateMediaSession(release);
      updateState({ status: "loading", activeRelease: release, activePreview: undefined, source: endpoint, duration: authorization.duration ?? 0, error: undefined, lastEvent: "full_song_authorized" });
      await play();
    } catch { fail(); }
  }, [loadPreview, play, refreshUsage, stop, updateMediaSession, updateState]);

  const playPreview = useCallback(async (preview: PublicAudioPreviewContract, release: PublicAudioReleaseSummary, options: { sourceContext?: string } = {}) => {
    const current = stateRef.current;
    if (current.activeRelease?.releaseId === release.releaseId && current.source === preview.url) {
      if (current.status === "playing" || current.status === "buffering") {
        audioRef.current?.pause();
        return;
      }
      await play();
      return;
    }
    await loadPreview(preview, release, { autoplay: true, sourceContext: options.sourceContext ?? "play_preview" });
  }, [loadPreview, play]);

  const playNext = useCallback(async () => {
    const currentId = stateRef.current.activeRelease?.releaseId;
    const currentIndex = queueRef.current.findIndex((item) => item.release.releaseId === currentId);
    const next = queueRef.current[currentIndex >= 0 ? currentIndex + 1 : 0];
    if (next) await playQueued(next.preview, next.release);
  }, [playQueued]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(async () => {
    if (stateRef.current.status === "playing" || stateRef.current.status === "buffering") pause();
    else await play();
  }, [pause, play]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = clampAudioTime(seconds, Number.isFinite(audio.duration) ? audio.duration : stateRef.current.duration);
    audio.currentTime = nextTime;
    updateState({ currentTime: nextTime, lastEvent: "seek" });
  }, [updateState]);

  const seekBy = useCallback((seconds: number) => {
    seek(stateRef.current.currentTime + seconds);
  }, [seek]);

  const setVolume = useCallback((value: number) => {
    const volume = Math.max(0, Math.min(value, 1));
    if (audioRef.current) audioRef.current.volume = volume;
    updateState({ volume, lastEvent: "volume" });
  }, [updateState]);

  const setMuted = useCallback((value: boolean) => {
    if (audioRef.current) audioRef.current.muted = value;
    updateState({ muted: value, lastEvent: "muted" });
  }, [updateState]);

  const retry = useCallback(async () => {
    if (queuedRequest.current) { await playQueued(queuedRequest.current.preview, queuedRequest.current.release); return; }
    const { activePreview, activeRelease } = stateRef.current;
    if (!activePreview || !activeRelease) return;
    await loadPreview(activePreview, activeRelease, { autoplay: true, sourceContext: "retry" });
  }, [loadPreview, playQueued]);

  const invalidateActiveRelease = useCallback((releaseId: string, reason = "release_unavailable") => {
    if (stateRef.current.activeRelease?.releaseId !== releaseId) return;
    stop();
    updateState({
      status: "unavailable",
      source: undefined,
      error: createAudioPlaybackError("AUDIO_RELEASE_UNPUBLISHED", "This preview is no longer available.", false, { releaseId, safeDetails: { reason } }),
      lastEvent: "release_invalidated",
    });
  }, [stop, updateState]);

  useEffect(() => {
    const changed = () => { stop(); clearQueue(); };
    const storage = (event: StorageEvent) => { if (event.key === authShellChangedEvent || event.key === null) changed(); };
    window.addEventListener(authShellChangedEvent, changed);
    window.addEventListener("storage", storage);
    return () => { cancelProtected(); window.removeEventListener(authShellChangedEvent, changed); window.removeEventListener("storage", storage); };
  }, [cancelProtected, clearQueue, stop]);

  const isActive = useCallback((releaseId: string) => stateRef.current.activeRelease?.releaseId === releaseId, []);
  const getPlaybackState = useCallback((releaseId: string) => (stateRef.current.activeRelease?.releaseId === releaseId ? stateRef.current.status : "idle"), []);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const updateTiming = (eventName: string) => {
      if (!stateRef.current.source) return;
      const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : stateRef.current.activePreview?.durationSeconds ?? 0;
      updateState({ currentTime: clampAudioTime(audio.currentTime, duration), duration, bufferedRanges: getBufferedRanges(audio), lastEvent: eventName });
    };
    const setReady = () => {
      if (!stateRef.current.source) return;
      updateTiming("loadedmetadata");
      setStatus("ready", "loadedmetadata");
    };
    const setPlaying = () => {
      if (!stateRef.current.source) { audio.pause(); return; }
      const session = protectedSession.current;
      if (session && stateRef.current.activeRelease) {
        protectedStarted.current = true;
        void refreshUsage(stateRef.current.activeRelease);
      }
      if (session?.sessionId) void protectedMediaApiService.playbackState(session.sessionId, "playing").catch(() => {
        if (protectedSession.current === session) stop();
      });
      updateTiming("playing");
      setStatus("playing", "playing");
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
    };
    const setPaused = () => {
      if (!stateRef.current.source) return;
      const session = protectedSession.current;
      if (session?.sessionId) void protectedMediaApiService.playbackState(session.sessionId, "paused").catch(() => {
        if (protectedSession.current === session) stop();
      });
      updateTiming("pause");
      if (stateRef.current.status !== "ended" && stateRef.current.status !== "idle") setStatus("paused", "pause");
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
    };
    const setEnded = () => {
      if (!stateRef.current.source) return;
      const session = protectedSession.current;
      if (session?.sessionId) void protectedMediaApiService.playbackState(session.sessionId, "completed").catch(() => undefined);
      cancelProtected();
      audio.removeAttribute("src");
      audio.load();
      updateState({ status: "ended", source: undefined, currentTime: stateRef.current.duration || 0, lastEvent: "ended" });
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
      void playNext();
    };
    const setError = () => {
      if (!stateRef.current.source) return;
      const releaseId = stateRef.current.activeRelease?.releaseId;
      if (protectedSession.current) stop();
      updateState({ status: "error", error: mapMediaError(audio.error, releaseId), lastEvent: "error" });
    };
    const setBuffering = () => {
      updateTiming("waiting");
      if (stateRef.current.status === "playing") setStatus("buffering", "waiting");
    };
    const setStalled = () => {
      if (!stateRef.current.source) return;
      updateState({ status: "buffering", error: createAudioPlaybackError("AUDIO_STALLED", "Audio preview loading stalled.", true, { releaseId: stateRef.current.activeRelease?.releaseId }), lastEvent: "stalled" });
    };

    audio.addEventListener("loadstart", () => { if (stateRef.current.source) setStatus("loading", "loadstart"); });
    audio.addEventListener("loadedmetadata", setReady);
    audio.addEventListener("loadeddata", () => updateTiming("loadeddata"));
    audio.addEventListener("canplay", () => updateTiming("canplay"));
    audio.addEventListener("playing", setPlaying);
    audio.addEventListener("pause", setPaused);
    audio.addEventListener("waiting", setBuffering);
    audio.addEventListener("stalled", setStalled);
    audio.addEventListener("seeking", () => updateState({ lastEvent: "seeking" }));
    audio.addEventListener("seeked", () => updateTiming("seeked"));
    audio.addEventListener("timeupdate", () => updateTiming("timeupdate"));
    audio.addEventListener("progress", () => updateTiming("progress"));
    audio.addEventListener("durationchange", () => updateTiming("durationchange"));
    audio.addEventListener("ended", setEnded);
    audio.addEventListener("error", setError);
    audio.addEventListener("abort", () => updateState({ lastEvent: "abort" }));
    audio.addEventListener("emptied", () => updateState({ lastEvent: "emptied" }));
    audio.addEventListener("suspend", () => updateState({ lastEvent: "suspend" }));

    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audioRef.current = null;
      clearMediaSession();
    };
  }, [cancelProtected, clearMediaSession, playNext, refreshUsage, setStatus, stop, updateState]);

  const value = useMemo(
    () => ({
      ...state,
      playbackMode,
      protectedUsage,
      playQueued,
      queue,
      enqueue,
      removeFromQueue,
      clearQueue,
      playNext,
      loadPreview,
      playPreview,
      play,
      pause,
      toggle,
      seek,
      seekBy,
      setVolume,
      setMuted,
      stop,
      clear,
      retry,
      invalidateActiveRelease,
      isActive,
      getPlaybackState,
    }),
    [clear, clearQueue, enqueue, getPlaybackState, invalidateActiveRelease, isActive, loadPreview, pause, play, playbackMode, protectedUsage, playQueued, playNext, playPreview, queue, removeFromQueue, retry, seek, seekBy, setMuted, setVolume, state, stop, toggle],
  );

  return <PublicAudioPlayerContext.Provider value={value}>{children}</PublicAudioPlayerContext.Provider>;
}
