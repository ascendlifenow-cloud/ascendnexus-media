import type { MediaBatchUploadSummary } from "../../../utils/media/batchUploadUtils";
import { AdminBatchUploadProgress } from "./AdminBatchUploadProgress";

const statItems = (summary: MediaBatchUploadSummary) => [
  ["Total", summary.totalFiles],
  ["Valid", summary.validFiles],
  ["Invalid", summary.invalidFiles],
  ["Uploading", summary.uploadingFiles],
  ["Completed", summary.completedFiles],
  ["Failed", summary.failedFiles],
  ["Canceled", summary.canceledFiles],
];

export function AdminBatchUploadSummary({ summary }: { summary: MediaBatchUploadSummary | null }) {
  if (!summary) return null;
  return (
    <section className="grid gap-4 rounded-md border border-white/10 bg-black/18 p-4" aria-label="Batch upload summary">
      <AdminBatchUploadProgress progress={summary.progress} status={summary.status} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {statItems(summary).map(([label, value]) => (
          <div key={label} className="rounded-md border border-white/8 bg-white/[0.03] p-3">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">{label}</div>
            <div className="mt-1 text-xl font-semibold text-white">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
