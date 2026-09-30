import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PublicAudioPlayerContext } from "../contexts/PublicAudioPlayerContext";
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
  }, [clearMediaSession, updateState]);

  const clear = stop;

  const play = useCallback(async () => {
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
  }, [setStatus, updateState]);

  const loadPreview = useCallback(async (preview: PublicAudioPreviewContract, release: PublicAudioReleaseSummary, options: { autoplay?: boolean; sourceContext?: string } = {}) => {
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
  }, [play, updateMediaSession, updateState]);

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
    const { activePreview, activeRelease } = stateRef.current;
    if (!activePreview || !activeRelease) return;
    await loadPreview(activePreview, activeRelease, { autoplay: true, sourceContext: "retry" });
  }, [loadPreview]);

  const invalidateActiveRelease = useCallback((releaseId: string, reason = "release_unavailable") => {
    if (stateRef.current.activeRelease?.releaseId !== releaseId) return;
    audioRef.current?.pause();
    updateState({
      status: "unavailable",
      source: undefined,
      error: createAudioPlaybackError("AUDIO_RELEASE_UNPUBLISHED", "This preview is no longer available.", false, { releaseId, safeDetails: { reason } }),
      lastEvent: "release_invalidated",
    });
  }, [updateState]);

  const isActive = useCallback((releaseId: string) => stateRef.current.activeRelease?.releaseId === releaseId, []);
  const getPlaybackState = useCallback((releaseId: string) => (stateRef.current.activeRelease?.releaseId === releaseId ? stateRef.current.status : "idle"), []);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const updateTiming = (eventName: string) => {
      const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : stateRef.current.activePreview?.durationSeconds ?? 0;
      updateState({ currentTime: clampAudioTime(audio.currentTime, duration), duration, bufferedRanges: getBufferedRanges(audio), lastEvent: eventName });
    };
    const setReady = () => {
      updateTiming("loadedmetadata");
      setStatus("ready", "loadedmetadata");
    };
    const setPlaying = () => {
      updateTiming("playing");
      setStatus("playing", "playing");
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
    };
    const setPaused = () => {
      updateTiming("pause");
      if (stateRef.current.status !== "ended" && stateRef.current.status !== "idle") setStatus("paused", "pause");
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
    };
    const setEnded = () => {
      updateState({ status: "ended", currentTime: stateRef.current.duration || 0, lastEvent: "ended" });
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
    };
    const setError = () => {
      updateState({ status: "error", error: mapMediaError(audio.error, stateRef.current.activeRelease?.releaseId), lastEvent: "error" });
    };
    const setBuffering = () => {
      updateTiming("waiting");
      if (stateRef.current.status === "playing") setStatus("buffering", "waiting");
    };
    const setStalled = () => {
      updateState({ status: "buffering", error: createAudioPlaybackError("AUDIO_STALLED", "Audio preview loading stalled.", true, { releaseId: stateRef.current.activeRelease?.releaseId }), lastEvent: "stalled" });
    };

    audio.addEventListener("loadstart", () => setStatus("loading", "loadstart"));
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
  }, [clearMediaSession, setStatus, updateState]);

  const value = useMemo(
    () => ({
      ...state,
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
    [clear, getPlaybackState, invalidateActiveRelease, isActive, loadPreview, pause, play, playPreview, retry, seek, seekBy, setMuted, setVolume, state, stop, toggle],
  );

  return <PublicAudioPlayerContext.Provider value={value}>{children}</PublicAudioPlayerContext.Provider>;
}
