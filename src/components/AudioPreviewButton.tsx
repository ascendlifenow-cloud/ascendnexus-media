import { Loader2, Pause, Play } from "lucide-react";

interface AudioPreviewButtonProps {
  isPlaying: boolean;
  isLoading: boolean;
  isDisabled: boolean;
  label: string;
  compact?: boolean;
  onClick: () => void;
}

export function AudioPreviewButton({ isPlaying, isLoading, isDisabled, label, compact, onClick }: AudioPreviewButtonProps) {
  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-bold transition focus:outline-none focus:ring-2 focus:ring-cyanGlow/60 disabled:cursor-not-allowed disabled:opacity-42 ${
        compact
          ? "min-h-10 px-3 text-xs text-white hover:bg-white/10"
          : "min-h-12 bg-cyanGlow px-5 text-sm text-ink hover:bg-white"
      }`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : isPlaying ? (
        <Pause className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Play className="h-4 w-4" aria-hidden="true" />
      )}
      {compact ? "Preview" : isPlaying ? "Pause Preview" : "Play Preview"}
    </button>
  );
}
