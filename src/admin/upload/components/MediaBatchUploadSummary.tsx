import type { MediaBatchUploadJob } from "../../../models/media";

export function MediaBatchUploadSummary({ batch }: { batch?: MediaBatchUploadJob | null }) {
  if (!batch) return null;
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.055] p-3 text-sm text-white/62">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-white">Batch {batch.status.replace(/_/g, " ")}</span>
        <span>{batch.progress}%</span>
      </div>
      <p className="mt-1">
        {batch.completedCount} completed · {batch.failedCount} failed · {batch.canceledCount} canceled · {batch.totalCount} total
      </p>
    </div>
  );
}
