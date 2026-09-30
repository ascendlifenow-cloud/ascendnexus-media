import type { AdminUploadQueueItem as QueueItem } from "../models/AdminUploadQueueItem";
import { AdminUploadActions } from "./AdminUploadActions";
import { AdminUploadQueueItem } from "./AdminUploadQueueItem";

interface AdminUploadQueueProps {
  items: QueueItem[];
  onStartUpload: (queueItemId: string) => void;
  onStartAll: () => void;
  onCancel: (queueItemId: string) => void;
  onRetry: (queueItemId: string) => void;
  onRemove: (queueItemId: string) => void;
  onClearCompleted: () => void;
}

export function AdminUploadQueue({
  items,
  onStartUpload,
  onStartAll,
  onCancel,
  onRetry,
  onRemove,
  onClearCompleted,
}: AdminUploadQueueProps) {
  if (!items.length) return null;
  const hasReadyItems = items.some((item) => item.status === "ready" || item.status === "queued");

  return (
    <section className="grid gap-4" aria-label="Upload queue">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Upload Queue</h2>
          <p className="text-sm text-white/52">{items.length} file{items.length === 1 ? "" : "s"} selected</p>
        </div>
        <AdminUploadActions hasReadyItems={hasReadyItems} onStart={onStartAll} onClearCompleted={onClearCompleted} />
      </div>
      <div className="grid gap-3">
        {items.map((item) => (
          <AdminUploadQueueItem
            key={item.queueItemId}
            item={item}
            onStart={onStartUpload}
            onCancel={onCancel}
            onRetry={onRetry}
            onRemove={onRemove}
          />
        ))}
      </div>
    </section>
  );
}
