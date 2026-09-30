import type { MediaLibraryUploadBatchSummary } from "../../utils/mediaLibraryUploadUtils";

interface AdminMediaUploadSummaryProps {
  summary: MediaLibraryUploadBatchSummary;
  lastError?: string | null;
}

export function AdminMediaUploadSummary({ summary, lastError }: AdminMediaUploadSummaryProps) {
  return (
    <div className="grid gap-3 rounded-md border border-white/10 bg-black/18 p-3 text-sm md:grid-cols-5" aria-live="polite">
      <p><span className="text-white/42">Queued</span><br /><strong className="text-white">{summary.total}</strong></p>
      <p><span className="text-white/42">Active</span><br /><strong className="text-white">{summary.active}</strong></p>
      <p><span className="text-white/42">Completed</span><br /><strong className="text-anm-success">{summary.completed}</strong></p>
      <p><span className="text-white/42">Failed</span><br /><strong className="text-anm-danger">{summary.failed}</strong></p>
      <p><span className="text-white/42">Canceled</span><br /><strong className="text-white/70">{summary.canceled}</strong></p>
      {lastError ? <p className="md:col-span-5 text-anm-danger">{lastError}</p> : null}
    </div>
  );
}
