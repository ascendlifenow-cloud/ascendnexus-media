interface AudioProgressBarProps {
  currentTime: number;
  duration: number;
  compact?: boolean;
  onSeek: (time: number) => void;
}

export function AudioProgressBar({ currentTime, duration, compact, onSeek }: AudioProgressBarProps) {
  const max = duration > 0 ? duration : 0;
  const progress = max > 0 ? (currentTime / max) * 100 : 0;

  return (
    <div className="w-full">
      <input
        type="range"
        min="0"
        max={max}
        step="0.1"
        value={max > 0 ? currentTime : 0}
        onChange={(event) => onSeek(Number(event.target.value))}
        disabled={max === 0}
        aria-label="Audio preview progress"
        className="sr-only"
      />
      <button
        type="button"
        disabled={max === 0}
        onClick={(event) => {
          if (max === 0) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
          onSeek(ratio * max);
        }}
        className={`block w-full rounded-full bg-white/12 text-left focus:outline-none focus:ring-2 focus:ring-cyanGlow/60 disabled:cursor-not-allowed ${compact ? "h-1.5" : "h-2.5"}`}
        aria-label="Seek audio preview"
      >
        <span
          className={`block rounded-full bg-gradient-to-r from-cyanGlow to-rosePulse ${compact ? "h-1.5" : "h-2.5"}`}
          style={{ width: `${progress}%` }}
        />
      </button>
    </div>
  );
}
