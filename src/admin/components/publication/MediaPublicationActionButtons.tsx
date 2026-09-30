import { Archive, CloudUpload, RotateCcw, Undo2 } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import type { MediaPublicationOperation, MediaPublicationReadiness } from "../../../models/publication";

interface Props {
  readiness?: MediaPublicationReadiness;
  operation?: MediaPublicationOperation;
  busy?: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onRetry: () => void;
  onCancel: () => void;
}

const activeStatuses = new Set(["requested", "validating", "waiting_for_processing", "promoting_storage", "updating_records", "activating_delivery", "verifying_sync"]);

export function MediaPublicationActionButtons({ readiness, operation, busy, onPublish, onUnpublish, onArchive, onRestore, onRetry, onCancel }: Props) {
  const active = operation ? activeStatuses.has(operation.status) : false;
  const retryable = operation ? ["failed", "blocked", "completed_with_warnings"].includes(operation.status) : false;
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="primary" disabled={busy || active || !readiness?.ready} onClick={onPublish} title={!readiness?.ready ? "Publication blockers must be resolved first." : undefined}>
        <CloudUpload className="h-4 w-4" aria-hidden />
        Publish
      </Button>
      <Button type="button" variant="glass" disabled={busy || active} onClick={onUnpublish}>
        <Undo2 className="h-4 w-4" aria-hidden />
        Unpublish
      </Button>
      <Button type="button" variant="ghost" disabled={busy || active} onClick={onArchive}>
        <Archive className="h-4 w-4" aria-hidden />
        Archive
      </Button>
      <Button type="button" variant="ghost" disabled={busy || active} onClick={onRestore}>
        Restore
      </Button>
      <Button type="button" variant="ghost" disabled={busy || !retryable} onClick={onRetry}>
        <RotateCcw className="h-4 w-4" aria-hidden />
        Retry
      </Button>
      <Button type="button" variant="ghost" disabled={busy || !active} onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
