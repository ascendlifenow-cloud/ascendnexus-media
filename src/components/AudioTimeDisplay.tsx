interface AudioTimeDisplayProps {
  currentTime: string;
  duration: string;
  compact?: boolean;
}

export function AudioTimeDisplay({ currentTime, duration, compact }: AudioTimeDisplayProps) {
  if (compact) {
    return <span className="text-xs tabular-nums text-white/54">{currentTime}</span>;
  }

  return (
    <span className="text-sm tabular-nums text-white/62">
      {currentTime} / {duration}
    </span>
  );
}
