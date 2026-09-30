import type { MediaBatchUploadSession } from "../../../models/media";
import { AdminBatchUploadFileRow } from "./AdminBatchUploadFileRow";

interface AdminBatchUploadQueueProps {
  session: MediaBatchUploadSession | null;
  running?: boolean;
  onRetryFile: (batchFileId: string) => void;
  onCancelFile: (batchFileId: string) => void;
}

export function AdminBatchUploadQueue({ session, running = false, onRetryFile, onCancelFile }: AdminBatchUploadQueueProps) {
  if (!session?.files.length) {
    return <div className="rounded-md border border-white/10 bg-black/18 p-4 text-sm text-white/58">Selected batch files will appear here for validation and upload.</div>;
  }

  return (
    <section aria-label="Batch upload queue" className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">Batch Queue</h3>
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/38">{session.files.length} files</span>
      </div>
      <ul className="grid max-h-[520px] gap-3 overflow-auto pr-1">
        {session.files.map((item) => (
          <AdminBatchUploadFileRow key={item.batchFileId} item={item} running={running} onRetry={onRetryFile} onCancel={onCancelFile} />
        ))}
      </ul>
    </section>
  );
}
