import type { MediaBatchUploadSessionStatus } from "../../../models/media";
import { cx } from "../../../utils/format";

interface AdminBatchUploadProgressProps {
  progress: number;
  status: MediaBatchUploadSessionStatus | string;
  label?: string;
}

export function AdminBatchUploadProgress({ progress, status, label = "Batch upload progress" }: AdminBatchUploadProgressProps) {
  const value = Math.max(0, Math.min(100, Math.round(progress)));
  const failed = status === "failed" || status === "canceled" || status === "validation_failed";
  const completed = status === "completed";

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/44">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label={`${label}: ${value}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <div
          className={cx(
            "h-full rounded-full transition-all duration-300",
            failed ? "bg-anm-pink" : completed ? "bg-anm-success" : "bg-gradient-to-r from-anm-purple via-anm-pink to-anm-gold",
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
