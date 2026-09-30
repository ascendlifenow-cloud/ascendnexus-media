import type { MediaProcessingJobStatusValue } from "../../../../models/media";

export function AdminProcessingProgress({
  progress,
  status,
  message,
  showPercentage = true,
  compact = false,
}: {
  progress: number;
  status?: MediaProcessingJobStatusValue;
  message?: string;
  showPercentage?: boolean;
  compact?: boolean;
}) {
  const value = Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0));
  const failed = status === "failed" || status === "dead_letter" || status === "canceled";
  return (
    <div className={compact ? "grid gap-1" : "grid gap-2"} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={message ?? `Processing ${value}%`}>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-all ${failed ? "bg-red-400" : status === "completed" ? "bg-emerald-300" : "bg-anm-gold"}`} style={{ width: `${value}%` }} />
      </div>
      {!compact && (showPercentage || message) ? (
        <div className="flex justify-between gap-3 text-xs text-white/50">
          {message ? <span className="truncate">{message}</span> : <span />}
          {showPercentage ? <span>{value}%</span> : null}
        </div>
      ) : null}
    </div>
  );
}
