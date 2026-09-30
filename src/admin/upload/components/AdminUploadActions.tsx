import { UploadCloud } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import type { AdminUploadQueueItem } from "../models/AdminUploadQueueItem";
import { MediaUploadCancelButton } from "./MediaUploadCancelButton";
import { MediaUploadRetryButton } from "./MediaUploadRetryButton";

interface AdminUploadActionsProps {
  item?: AdminUploadQueueItem;
  hasReadyItems?: boolean;
  onStart?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onRemove?: () => void;
  onClearCompleted?: () => void;
}

export function AdminUploadActions({
  item,
  hasReadyItems = false,
  onStart,
  onCancel,
  onRetry,
  onRemove,
  onClearCompleted,
}: AdminUploadActionsProps) {
  if (!item) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" disabled={!hasReadyItems} onClick={onStart}>
          <UploadCloud className="h-4 w-4" aria-hidden />
          Start Upload
        </Button>
        <Button type="button" variant="glass" onClick={onClearCompleted}>
          Clear Completed
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {item.status === "ready" || item.status === "queued" ? (
        <Button type="button" variant="glass" size="sm" onClick={onStart}>
          <UploadCloud className="h-4 w-4" aria-hidden />
          Upload
        </Button>
      ) : null}
      {item.status === "uploading" ? (
        <MediaUploadCancelButton onCancel={onCancel ?? (() => undefined)} />
      ) : null}
      {item.status === "failed" || item.status === "canceled" ? (
        <MediaUploadRetryButton onRetry={onRetry ?? (() => undefined)} />
      ) : null}
      {item.status !== "uploading" ? (
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      ) : null}
    </div>
  );
}
