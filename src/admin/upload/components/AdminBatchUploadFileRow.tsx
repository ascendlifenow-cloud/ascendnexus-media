import type { MediaBatchFileItem } from "../../../models/media";
import { AdminBatchUploadProgress } from "./AdminBatchUploadProgress";

interface AdminBatchUploadFileRowProps {
  item: MediaBatchFileItem;
  running?: boolean;
  onRetry: (batchFileId: string) => void;
  onCancel: (batchFileId: string) => void;
}

const statusLabel = (status: string): string => status.replace(/_/g, " ");
const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

export function AdminBatchUploadFileRow({ item, running = false, onRetry, onCancel }: AdminBatchUploadFileRowProps) {
  const canRetry = item.status === "failed";
  const canCancel = ["selected", "ready", "queued", "uploading", "processing"].includes(item.status);
  return (
    <li className="grid gap-3 rounded-md border border-white/10 bg-black/18 p-3 md:grid-cols-[minmax(0,1fr)_180px_160px] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-white">{item.fileName}</p>
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/48">{statusLabel(item.status)}</span>
        </div>
        <p className="mt-1 text-xs text-white/44">{item.assetType} / {item.mimeType || "unknown MIME"} / {formatBytes(item.fileSizeBytes)}</p>
        {item.sanitizedFileName && item.sanitizedFileName !== item.fileName ? (
          <p className="mt-1 text-xs text-anm-gold">Sanitized: {item.sanitizedFileName}</p>
        ) : null}
        {item.errors?.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-anm-pink">
            {item.errors.slice(0, 3).map((error) => <li key={error}>{error}</li>)}
          </ul>
        ) : null}
        {item.warnings?.length ? <p className="mt-2 text-xs text-anm-gold">{[...new Set(item.warnings)].slice(0, 2).join(" ")}</p> : null}
      </div>
      <AdminBatchUploadProgress progress={item.progress} status={item.status} label="File progress" />
      <div className="flex flex-wrap gap-2 md:justify-end">
        <button type="button" className="min-h-9 rounded-md border border-white/12 px-3 text-xs font-semibold text-white disabled:opacity-40" disabled={!canRetry || running} onClick={() => onRetry(item.batchFileId)}>Retry</button>
        <button type="button" className="min-h-9 rounded-md border border-white/12 px-3 text-xs font-semibold text-white disabled:opacity-40" disabled={!canCancel || running} onClick={() => onCancel(item.batchFileId)}>Cancel</button>
      </div>
    </li>
  );
}
