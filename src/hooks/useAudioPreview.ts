import { useCallback, useMemo } from "react";
import { usePublicAudioPlayer } from "./public";
import type { PublicAudioPreviewContract, PublicAudioReleaseSummary } from "../state/audio/audioPlayerTypes";
import { formatAudioTime } from "../utils/audio/audioTimeUtils";

interface UseAudioPreviewOptions {
  releaseId: string;
  audioPreviewUrl?: string;
  title?: string;
  artistName?: string;
  durationSeconds?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: () => void;
}

export function useAudioPreview({ releaseId, audioPreviewUrl, title = "Audio preview", artistName, durationSeconds, onPlay, onPause }: UseAudioPreviewOptions) {
  const player = usePublicAudioPlayer();
  const active = player.isActive(releaseId);
  const hasPreview = typeof audioPreviewUrl === "string" && audioPreviewUrl.trim().length > 0;
  const preview = useMemo<PublicAudioPreviewContract | undefined>(
    () => hasPreview && audioPreviewUrl ? { releaseId, url: audioPreviewUrl, durationSeconds } : undefined,
    [audioPreviewUrl, durationSeconds, hasPreview, releaseId],
  );
  const release = useMemo<PublicAudioReleaseSummary>(() => ({ releaseId, title, artistName }), [artistName, releaseId, title]);

  const play = useCallback(async () => {
    if (!preview) return;
    await player.playPreview(preview, release, { sourceContext: "legacy_hook" });
    onPlay?.();
  }, [onPlay, player, preview, release]);

  const pause = useCallback(() => {
    player.pause();
    onPause?.();
  }, [onPause, player]);

  const toggle = useCallback(() => {
    if (active && player.status === "playing") pause();
    else void play();
  }, [active, pause, play, player.status]);

  const restart = useCallback(() => {
    player.seek(0);
    void play();
  }, [play, player]);

  return {
    audioRef: { current: null },
    isPlaying: active && player.status === "playing",
    isLoading: active && (player.status === "loading" || player.status === "buffering"),
    currentTime: active ? player.currentTime : 0,
    duration: active && player.duration ? player.duration : durationSeconds ?? 0,
    error: active && Boolean(player.error),
    hasPreview,
    formattedCurrentTime: formatAudioTime(active ? player.currentTime : 0),
    formattedDuration: formatAudioTime(active && player.duration ? player.duration : durationSeconds),
    play,
    pause,
    restart,
    toggle,
    seek: player.seek,
  };
}

