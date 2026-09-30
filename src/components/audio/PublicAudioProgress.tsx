import { formatAudioTime } from "../../utils/audio/audioTimeUtils";

interface PublicAudioProgressProps {
  currentTime: number;
  duration: number;
  bufferedEnd?: number;
  compact?: boolean;
  onSeek: (seconds: number) => void;
}

export function PublicAudioProgress({ currentTime, duration, bufferedEnd = 0, compact, onSeek }: PublicAudioProgressProps) {
  const max = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const played = max > 0 ? Math.min(100, Math.max(0, (currentTime / max) * 100)) : 0;
  const buffered = max > 0 ? Math.min(100, Math.max(0, (bufferedEnd / max) * 100)) : 0;

  return (
    <label className="block w-full">
      <span className="sr-only">Audio preview position, {formatAudioTime(currentTime)} of {formatAudioTime(duration)}</span>
      <span className={`relative block overflow-hidden rounded-full bg-white/12 ${compact ? "h-1.5" : "h-2.5"}`}>
        <span className="absolute inset-y-0 left-0 rounded-full bg-white/18" style={{ width: `${buffered}%` }} />
        <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyanGlow to-rosePulse" style={{ width: `${played}%` }} />
      </span>
      <input
        type="range"
        min="0"
        max={max}
        step="0.1"
        value={max > 0 ? Math.min(currentTime, max) : 0}
        disabled={max === 0}
        onChange={(event) => onSeek(Number(event.target.value))}
        aria-label="Seek audio preview"
        aria-valuetext={`${formatAudioTime(currentTime)} of ${formatAudioTime(duration)}`}
        className="anm-focus mt-2 h-2 w-full cursor-pointer accent-cyanGlow disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}

