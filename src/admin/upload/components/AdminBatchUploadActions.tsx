import type { MediaBatchUploadSession } from "../../../models/media";

interface AdminBatchUploadActionsProps {
  session: MediaBatchUploadSession | null;
  running?: boolean;
  onValidate: () => void;
  onStart: () => void;
  onRetryFailed: () => void;
  onCancel: () => void;
  onClearCompleted: () => void;
}

const buttonClass = "min-h-10 rounded-md border border-white/12 px-4 text-sm font-semibold text-white transition hover:border-anm-pink focus:outline-none focus:ring-2 focus:ring-anm-pink/30 disabled:cursor-not-allowed disabled:opacity-45";

export function AdminBatchUploadActions({
  session,
  running = false,
  onValidate,
  onStart,
  onRetryFailed,
  onCancel,
  onClearCompleted,
}: AdminBatchUploadActionsProps) {
  const hasReady = Boolean(session?.files.some((file) => file.status === "ready" || file.status === "selected" || file.status === "queued"));
  const hasFailed = Boolean(session?.files.some((file) => file.status === "failed"));
  const hasCompleted = Boolean(session?.files.some((file) => file.status === "completed"));
  const canCancel = Boolean(session && ["validating", "uploading", "processing", "ready"].includes(session.status));

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={buttonClass} disabled={!session || running} onClick={onValidate}>Validate</button>
      <button type="button" className={buttonClass} disabled={!session || running || !hasReady} onClick={onStart}>Upload Valid Files</button>
      <button type="button" className={buttonClass} disabled={!hasFailed || running} onClick={onRetryFailed}>Retry Failed</button>
      <button type="button" className={buttonClass} disabled={!canCancel || running} onClick={onCancel}>Cancel Batch</button>
      <button type="button" className={buttonClass} disabled={!hasCompleted || running} onClick={onClearCompleted}>Clear Completed</button>
    </div>
  );
}
