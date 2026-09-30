import { cx } from "../../../utils/format";
import type { AdminUploadQueueItemStatus } from "../models/AdminUploadQueueItem";

interface AdminUploadProgressBarProps {
  progress: number;
  status: AdminUploadQueueItemStatus;
  indeterminate?: boolean;
}

export function AdminUploadProgressBar({ progress, status, indeterminate = false }: AdminUploadProgressBarProps) {
  const value = Math.max(0, Math.min(100, progress));
  const failed = status === "failed" || status === "canceled";
  const completed = status === "completed";

  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-white/10"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : value}
      aria-label={`Upload ${status}${indeterminate ? "" : ` ${value}%`}`}
    >
      <div
        className={cx(
          "h-full rounded-full transition-all duration-300",
          failed ? "bg-anm-pink" : completed ? "bg-anm-success" : "bg-gradient-to-r from-anm-purple via-anm-pink to-anm-gold",
          indeterminate ? "w-1/2 animate-pulse" : undefined,
        )}
        style={indeterminate ? undefined : { width: `${value}%` }}
      />
    </div>
  );
}
