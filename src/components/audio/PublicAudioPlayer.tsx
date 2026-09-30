import { RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { usePublicAudioPlayer } from "../../hooks/public";
import type { PublicAudioPreviewContract, PublicAudioReleaseSummary } from "../../state/audio/audioPlayerTypes";
import { formatAudioTime } from "../../utils/audio/audioTimeUtils";
import { cx } from "../../utils/format";
import { AudioPreviewButton } from "../AudioPreviewButton";
import { Button } from "../ui/Button";
import { PublicAudioProgress } from "./PublicAudioProgress";
import { PublicAudioWaveform } from "./PublicAudioWaveform";

interface PublicAudioPlayerProps {
  release: PublicAudioReleaseSummary;
  preview: PublicAudioPreviewContract;
  compact?: boolean;
  showProgress?: boolean;
  showTime?: boolean;
  showWaveform?: boolean;
  className?: string;
  onPlay?: () => void;
}

export function PublicAudioPlayer({ release, preview, compact, showProgress = true, showTime = true, showWaveform = true, className, onPlay }: PublicAudioPlayerProps) {
  const player = usePublicAudioPlayer();
  const active = player.isActive(release.releaseId);
  const status = active ? player.status : "idle";
  const isPlaying = active && status === "playing";
  const isLoading = active && (status === "loading" || status === "buffering");
  const error = active ? player.error : undefined;
  const duration = active && player.duration > 0 ? player.duration : preview.durationSeconds ?? 0;
  const currentTime = active ? player.currentTime : 0;
  const bufferedEnd = active ? Math.max(0, ...player.bufferedRanges.map((range) => range.end)) : 0;
  const unavailable = status === "unavailable" || status === "blocked" || status === "error";
  const label = unavailable
    ? `Retry preview of ${release.title}`
    : isPlaying
      ? `Pause preview of ${release.title}`
      : `Play preview of ${release.title}`;

  const toggle = () => {
    const wasPlaying = isPlaying;
    void player.playPreview(preview, release, { sourceContext: compact ? "card" : "detail" }).then(() => {
      const nextState = player.getPlaybackState(release.releaseId);
      if (!wasPlaying && !["error", "unavailable", "blocked"].includes(nextState)) onPlay?.();
    });
  };

  if (compact) {
    return (
      <div className={cx("rounded-md border border-white/10 bg-black/18 p-2", className)}>
        <div className="flex items-center gap-2">
          <AudioPreviewButton isPlaying={isPlaying} isLoading={isLoading} isDisabled={false} label={label} compact onClick={toggle} />
          {showProgress ? <PublicAudioProgress compact currentTime={currentTime} duration={duration} bufferedEnd={bufferedEnd} onSeek={player.seek} /> : null}
          {showTime ? <span className="min-w-20 text-right text-xs font-semibold text-white/58">{formatAudioTime(currentTime)} / {formatAudioTime(duration)}</span> : null}
        </div>
        {error ? <p className="mt-2 text-xs text-rose-200" role="status">{error.message}</p> : null}
      </div>
    );
  }

  return (
    <div className={cx("anm-glass-panel p-5", className)} role="region" aria-label={`Audio preview player for ${release.title}`}>
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyanGlow">Audio Preview</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{release.title}</h3>
          <p className="mt-1 text-sm text-white/58">{release.artistName ?? "Ascend Nexus Media"}</p>
          {status === "buffering" ? <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/50" role="status">Buffering</p> : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <AudioPreviewButton isPlaying={isPlaying} isLoading={isLoading} isDisabled={false} label={label} onClick={toggle} />
          <Button type="button" onClick={() => player.seek(0)} variant="ghost" size="lg">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Restart
          </Button>
          <Button type="button" onClick={() => player.setMuted(!player.muted)} variant="ghost" size="lg" aria-label={player.muted ? "Unmute preview" : "Mute preview"}>
            {player.muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
            {player.muted ? "Unmute" : "Mute"}
          </Button>
        </div>
      </div>
      {showWaveform ? <div className="mt-6"><PublicAudioWaveform peaks={preview.waveformData} currentTime={currentTime} duration={duration} onSeek={player.seek} /></div> : null}
      {showProgress ? <div className="mt-6"><PublicAudioProgress currentTime={currentTime} duration={duration} bufferedEnd={bufferedEnd} onSeek={player.seek} /></div> : null}
      {showTime ? <div className="mt-3 flex justify-end text-sm font-semibold text-white/58">{formatAudioTime(currentTime)} / {formatAudioTime(duration)}</div> : null}
      {error ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-rose-300/20 bg-rose-500/10 p-3 text-sm text-rose-100" role="alert">
          <span>{error.message}</span>
          {error.retryable ? <Button type="button" size="sm" variant="ghost" onClick={() => void player.retry()}>Retry</Button> : null}
        </div>
      ) : null}
    </div>
  );
}

export function PublicGlobalAudioPlayer() {
  const player = usePublicAudioPlayer();
  if (!player.activeRelease || !player.activePreview || player.status === "idle") return null;
  const duration = player.duration || player.activePreview.durationSeconds || 0;
  const isPlaying = player.status === "playing";
  return (
    <aside
      className="fixed inset-x-3 bottom-3 z-[60] rounded-md border border-white/12 bg-anm-bg/94 p-3 shadow-2xl backdrop-blur-xl sm:left-auto sm:w-[30rem]"
      role="region"
      aria-label="Global audio preview player"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-3">
        {player.activeRelease.coverArtUrl ? <img src={player.activeRelease.coverArtUrl} alt="" className="h-12 w-12 rounded object-cover" /> : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{player.activeRelease.title}</p>
          <p className="truncate text-xs text-white/52">{player.activeRelease.artistName ?? "Ascend Nexus Media"}</p>
          <PublicAudioProgress compact currentTime={player.currentTime} duration={duration} bufferedEnd={Math.max(0, ...player.bufferedRanges.map((range) => range.end))} onSeek={player.seek} />
        </div>
        <AudioPreviewButton isPlaying={isPlaying} isLoading={player.status === "loading" || player.status === "buffering"} isDisabled={false} label={isPlaying ? `Pause preview of ${player.activeRelease.title}` : `Play preview of ${player.activeRelease.title}`} compact onClick={() => void player.toggle()} />
        <Button type="button" variant="ghost" size="icon" onClick={player.stop} aria-label="Close audio player">
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      {player.error ? <p className="mt-2 text-xs text-rose-100" role="status">{player.error.message}</p> : null}
    </aside>
  );
}
