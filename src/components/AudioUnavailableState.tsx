import { VolumeX } from "lucide-react";

interface AudioUnavailableStateProps {
  title: string;
  error?: boolean;
  compact?: boolean;
}

export function AudioUnavailableState({ title, error, compact }: AudioUnavailableStateProps) {
  return (
    <div
      className={`flex items-center justify-center gap-2 rounded-md border border-dashed border-white/16 bg-black/18 text-center text-white/60 ${
        compact ? "min-h-10 px-3 text-xs" : "min-h-28 flex-col p-5 text-sm"
      }`}
      role="status"
      aria-label={error ? `Preview unavailable for ${title}` : `Preview coming soon for ${title}`}
    >
      <VolumeX className={compact ? "h-4 w-4 text-amberGlow" : "h-7 w-7 text-amberGlow"} aria-hidden="true" />
      <span>{error ? "Preview Unavailable" : "Preview Coming Soon"}</span>
    </div>
  );
}
