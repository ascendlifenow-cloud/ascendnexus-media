import type { AdminUploadQueueItem as QueueItem } from "../models/AdminUploadQueueItem";
import { formatFileSize, getUploadMediaLabel } from "../utils/uploadUiUtils";
import { AdminUploadActions } from "./AdminUploadActions";
import { AdminUploadErrorState } from "./AdminUploadErrorState";
import { AdminUploadPreview } from "./AdminUploadPreview";
import { AdminUploadProgressBar } from "./AdminUploadProgressBar";
import { AdminUploadSuccessState } from "./AdminUploadSuccessState";
import { AdminUploadValidationMessages } from "./AdminUploadValidationMessages";
import { MediaUploadJobDetailsPanel } from "./MediaUploadJobDetailsPanel";
import { MediaUploadJobProgress } from "./MediaUploadJobProgress";
import { MediaUploadJobStatusBadge } from "./MediaUploadJobStatusBadge";
import { MediaUploadStageIndicator } from "./MediaUploadStageIndicator";

interface AdminUploadQueueItemProps {
  item: QueueItem;
  onStart: (queueItemId: string) => void;
  onCancel: (queueItemId: string) => void;
  onRetry: (queueItemId: string) => void;
  onRemove: (queueItemId: string) => void;
}

export function AdminUploadQueueItem({ item, onStart, onCancel, onRetry, onRemove }: AdminUploadQueueItemProps) {
  return (
    <article className="rounded-anm-card border border-white/10 bg-black/18 p-4">
      <div className="grid gap-4 sm:grid-cols-[5rem_1fr]">
        <AdminUploadPreview item={item} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-white">{item.fileName}</h3>
              <p className="mt-1 text-sm text-white/48">
                {getUploadMediaLabel(item.mimeType)} · {formatFileSize(item.fileSizeBytes)} · {item.status}
              </p>
              {item.uploadJob ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <MediaUploadJobStatusBadge status={item.uploadJob.status} />
                  <MediaUploadStageIndicator
                    stage={item.uploadJob.stage}
                    failed={item.uploadJob.status === "failed" || item.uploadJob.status === "validation_failed"}
                  />
                </div>
              ) : null}
            </div>
            <AdminUploadActions
              item={item}
              onStart={() => onStart(item.queueItemId)}
              onCancel={() => onCancel(item.queueItemId)}
              onRetry={() => onRetry(item.queueItemId)}
              onRemove={() => onRemove(item.queueItemId)}
            />
          </div>
          <div className="mt-4">
            {item.uploadJob ? (
              <MediaUploadJobProgress job={item.uploadJob} />
            ) : (
              <AdminUploadProgressBar progress={item.progress} status={item.status} indeterminate={item.status === "processing"} />
            )}
          </div>
          {item.uploadJob ? (
            <div className="mt-3">
              <MediaUploadJobDetailsPanel job={item.uploadJob} processingStatuses={item.processingStatuses} />
            </div>
          ) : null}
          <div className="mt-3">
            <AdminUploadValidationMessages
              errors={item.errors}
              warnings={item.warnings}
              messages={[
                ...(item.validationResult?.blockingErrors ?? []),
                ...(item.validationResult?.warnings ?? []),
                ...(item.validationResult?.info ?? []),
              ]}
            />
          </div>
          {item.status === "completed" ? <div className="mt-3"><AdminUploadSuccessState result={item.uploadResult} /></div> : null}
          {item.status === "failed" ? <div className="mt-3"><AdminUploadErrorState errors={item.errors} /></div> : null}
        </div>
      </div>
    </article>
  );
}
