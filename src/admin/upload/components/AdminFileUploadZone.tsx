import { useCallback, useState } from "react";
import { UploadCloud } from "lucide-react";
import type { MediaAssetUploadOptions, MediaUploadResult, MediaUploadTarget } from "../../../models/media";
import { cx } from "../../../utils/format";
import { AdminRightShelf } from "../../components/AdminRightShelf";
import { AdminDropzone } from "./AdminDropzone";
import { AdminFilePickerButton } from "./AdminFilePickerButton";
import { AdminUploadEmptyState } from "./AdminUploadEmptyState";
import { AdminUploadQueue } from "./AdminUploadQueue";
import { useAdminFileUpload } from "../hooks/useAdminFileUpload";
import type { AdminUploadQueueItem } from "../models/AdminUploadQueueItem";
import { getAcceptHelperText } from "../utils/uploadUiUtils";
import { getAcceptForUploadTarget } from "../../../utils/media/uploadAcceptUtils";

interface AdminFileUploadZoneProps {
  uploadTarget: MediaUploadTarget;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  disabled?: boolean;
  label?: string;
  description?: string;
  helperText?: string;
  pickerLabel?: string;
  className?: string;
  uploadOptions?: MediaAssetUploadOptions;
  onUploadStart?: (item: AdminUploadQueueItem) => void;
  onUploadProgress?: (item: AdminUploadQueueItem) => void;
  onUploadSuccess?: (result: MediaUploadResult, item: AdminUploadQueueItem) => void;
  onUploadError?: (errors: string[], item: AdminUploadQueueItem) => void;
  onFilesSelected?: (files: File[]) => void;
}

export function AdminFileUploadZone({
  uploadTarget,
  accept,
  multiple = false,
  maxFiles = multiple ? 10 : 1,
  disabled = false,
  label = "Upload Media",
  description = "Drag files into this zone or choose files from your device.",
  helperText,
  pickerLabel = "Choose Files",
  className,
  uploadOptions,
  onUploadStart,
  onUploadProgress,
  onUploadSuccess,
  onUploadError,
  onFilesSelected,
}: AdminFileUploadZoneProps) {
  const [open, setOpen] = useState(false);
  const resolvedAccept = accept ?? getAcceptForUploadTarget(uploadTarget);
  const handleUploadSuccess = useCallback((result: MediaUploadResult, item: AdminUploadQueueItem) => {
    onUploadSuccess?.(result, item);
    setOpen(false);
  }, [onUploadSuccess]);
  const upload = useAdminFileUpload({
    uploadTarget,
    accept: resolvedAccept,
    multiple,
    maxFiles,
    onUploadStart,
    onUploadProgress,
    onUploadSuccess: handleUploadSuccess,
    onUploadError,
    onFilesSelected,
  });
  const selectedFileSummary = upload.queue.length
    ? `${upload.queue.length} file${upload.queue.length === 1 ? "" : "s"} selected`
    : "No files selected";

  return (
    <section className={cx("grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3", className)} aria-label={label}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="mt-1 text-xs text-white/52">{selectedFileSummary}. {description}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/12 px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-anm-gold/45 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-2 focus:ring-anm-electric/45"
        >
          <UploadCloud className="h-4 w-4" aria-hidden />
          {upload.queue.length ? "Review Upload" : pickerLabel}
        </button>
      </div>

      <AdminRightShelf
        open={open}
        title={label}
        description="Choose files, review the selected queue, and upload. The shelf closes after a successful upload."
        onClose={() => setOpen(false)}
      >
        <div className="grid gap-4">
          <AdminDropzone
            disabled={disabled}
            multiple={multiple}
            maxFiles={maxFiles}
            label={label}
            description={description}
            helperText={helperText ?? getAcceptHelperText(resolvedAccept)}
            onFilesDropped={upload.addFiles}
          >
            <AdminFilePickerButton
              label={pickerLabel}
              accept={resolvedAccept}
              multiple={multiple}
              disabled={disabled}
              onFilesSelected={upload.addFiles}
            />
          </AdminDropzone>
          {!upload.hasQueuedFiles ? <AdminUploadEmptyState helperText="Selected files will appear in the upload queue before they are sent to storage." /> : null}
          <AdminUploadQueue
            items={upload.queue}
            onStartUpload={(queueItemId) => void upload.startUpload(queueItemId, uploadOptions)}
            onStartAll={() => upload.startAllUploads(uploadOptions)}
            onCancel={upload.cancelUpload}
            onRetry={upload.retryUpload}
            onRemove={upload.removeQueueItem}
            onClearCompleted={upload.clearCompleted}
          />
        </div>
      </AdminRightShelf>
    </section>
  );
}
