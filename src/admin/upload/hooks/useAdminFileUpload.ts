import { useCallback, useRef, useState } from "react";
import type { MediaAssetUploadOptions, MediaAssetUploadStatus, MediaProcessingJobStatus, MediaUploadResult, MediaUploadTarget } from "../../../models/media";
import { mediaAssetUploadService, mediaBatchUploadJobService, mediaProcessingJobStatusService, mediaUploadJobService, mediaValidationService } from "../../../services/media";
import type { AdminUploadQueueItem, AdminUploadQueueItemStatus } from "../models/AdminUploadQueueItem";
import { createUploadQueueItemId, validateSelectedFiles } from "../utils/uploadUiUtils";

interface UseAdminFileUploadOptions {
  uploadTarget: MediaUploadTarget | null | undefined;
  multiple?: boolean;
  maxFiles?: number;
  accept?: string;
  onUploadStart?: (item: AdminUploadQueueItem) => void;
  onUploadProgress?: (item: AdminUploadQueueItem) => void;
  onUploadSuccess?: (result: MediaUploadResult, item: AdminUploadQueueItem) => void;
  onUploadError?: (errors: string[], item: AdminUploadQueueItem) => void;
  onFilesSelected?: (files: File[]) => void;
}

const nowIso = () => new Date().toISOString();
const fallbackUploadTarget: MediaUploadTarget = {
  targetType: "custom",
  assetType: "custom",
  intendedUse: "custom",
  accessLevel: "admin_only",
};

const mapUploadStatusToQueueStatus = (status: MediaAssetUploadStatus["status"]): AdminUploadQueueItemStatus => {
  if (status === "validating") return "validating";
  if (status === "uploading") return "uploading";
  if (status === "processing" || status === "creating_asset") return "processing";
  if (status === "completed") return "completed";
  if (status === "validation_failed" || status === "failed") return "failed";
  if (status === "canceled") return "canceled";
  return "queued";
};

const isProcessingStatus = (status: MediaProcessingJobStatus | null): status is MediaProcessingJobStatus => Boolean(status);

export const useAdminFileUpload = ({
  uploadTarget,
  multiple = false,
  maxFiles,
  accept,
  onUploadStart,
  onUploadProgress,
  onUploadSuccess,
  onUploadError,
  onFilesSelected,
}: UseAdminFileUploadOptions) => {
  const [queue, setQueue] = useState<AdminUploadQueueItem[]>([]);
  const progressTimers = useRef<Record<string, number>>({});

  const updateQueueItem = useCallback((queueItemId: string, patch: Partial<AdminUploadQueueItem>) => {
    setQueue((items) => items.map((item) => (item.queueItemId === queueItemId ? { ...item, ...patch, updatedAt: nowIso() } : item)));
  }, []);

  const clearProgressTimer = useCallback((queueItemId: string) => {
    const timer = progressTimers.current[queueItemId];
    if (timer && typeof window !== "undefined") window.clearInterval(timer);
    delete progressTimers.current[queueItemId];
  }, []);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const validation = validateSelectedFiles(files, uploadTarget, { multiple, maxFiles, accept });
    onFilesSelected?.(files);

    if (!uploadTarget) {
      setQueue((items) => [
        ...items,
        ...files.map((file) => ({
          queueItemId: createUploadQueueItemId(),
          file,
          fileName: file.name,
          fileSizeBytes: file.size,
          mimeType: file.type,
          status: "failed" as const,
          progress: 0,
          uploadTarget: fallbackUploadTarget,
          errors: validation.errors,
          warnings: validation.warnings,
          createdAt: nowIso(),
        })),
      ]);
      return;
    }

    const allowedFiles = !multiple ? files.slice(0, 1) : maxFiles ? files.slice(0, maxFiles) : files;
    const createdItems = allowedFiles.map<AdminUploadQueueItem>((file) => {
      const queueItemId = createUploadQueueItemId();
      const uploadJob = mediaUploadJobService.createUploadJob(file, uploadTarget, { queueItemId });
      return {
        queueItemId,
        file,
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
        status: validation.errors.length ? "failed" : "validating",
        progress: 0,
        uploadTarget,
        uploadJobId: uploadJob.uploadJobId,
        uploadJob,
        errors: validation.errors.length ? validation.errors : undefined,
        warnings: validation.warnings.length ? validation.warnings : undefined,
        createdAt: nowIso(),
      };
    });
    if (createdItems.length > 1) {
      mediaBatchUploadJobService.createBatchJob(createdItems.map((item) => item.uploadJobId).filter(Boolean) as string[], {
        source: "admin_upload_queue",
      });
    }
    setQueue((items) => [...items, ...createdItems]);
    createdItems.forEach((item) => {
      void mediaValidationService.validateFile(item.file, item.uploadTarget).then((result) => {
        const uploadJob = result.valid
          ? mediaUploadJobService.updateUploadJob(item.uploadJobId ?? "", { status: "ready", stage: "validation", progress: 12, validationResult: result })
          : mediaUploadJobService.markValidationFailed(item.uploadJobId ?? "", result);
        updateQueueItem(item.queueItemId, {
          validationResult: result,
          status: result.valid ? "ready" : "failed",
          uploadJob: uploadJob ?? item.uploadJob,
          errors: result.blockingErrors.map((message) => message.message),
          warnings: [...result.warnings, ...result.info].map((message) => message.message),
        });
      }).catch((error) => {
        updateQueueItem(item.queueItemId, {
          status: "failed",
          errors: [error instanceof Error ? error.message : "File validation failed."],
        });
      });
    });
  }, [accept, maxFiles, multiple, onFilesSelected, updateQueueItem, uploadTarget]);

  const startUpload = useCallback(async (queueItemId: string, options: MediaAssetUploadOptions = {}, itemOverride?: AdminUploadQueueItem) => {
    const item = itemOverride ?? queue.find((queueItem) => queueItem.queueItemId === queueItemId);
    if (!item || item.status === "uploading" || item.errors?.length) return;

    const validationResult = await mediaValidationService.validateFile(item.file, item.uploadTarget);
    if (!validationResult.valid) {
      const failed = {
        ...item,
        status: "failed" as const,
        validationResult,
        errors: validationResult.blockingErrors.map((message) => message.message),
        warnings: [...validationResult.warnings, ...validationResult.info].map((message) => message.message),
        updatedAt: nowIso(),
      };
      updateQueueItem(queueItemId, failed);
      onUploadError?.(failed.errors ?? [], failed);
      return;
    }

    updateQueueItem(queueItemId, {
      status: "uploading",
      progress: 8,
      validationResult,
      uploadJob: item.uploadJobId ? mediaUploadJobService.markUploadStarted(item.uploadJobId) ?? item.uploadJob : item.uploadJob,
      errors: undefined,
      warnings: [...validationResult.warnings, ...validationResult.info].map((message) => message.message),
    });
    onUploadStart?.({ ...item, status: "uploading", progress: 8, validationResult });

    if (typeof window !== "undefined") {
      progressTimers.current[queueItemId] = window.setInterval(() => {
        setQueue((items) =>
          items.map((queueItem) => {
            if (queueItem.queueItemId !== queueItemId || queueItem.status !== "uploading") return queueItem;
            const progress = Math.min(queueItem.progress + 12, 88);
            const next = { ...queueItem, progress, updatedAt: nowIso() };
            onUploadProgress?.(next);
            return next;
          }),
        );
      }, 160);
    }

    const result = await mediaAssetUploadService.uploadMediaAsset(item.file, item.uploadTarget, {
      ...options,
      metadata: {
        ...(options.metadata ?? {}),
        uploadJobId: item.uploadJobId ?? "",
        queueItemId,
      },
      onProgress: (progress) => {
        const uploadJob = item.uploadJobId ? mediaUploadJobService.getUploadJob(item.uploadJobId) : null;
        updateQueueItem(queueItemId, { progress, uploadJob: uploadJob ?? undefined });
        options.onProgress?.(progress);
      },
      onStatusChange: (status) => {
        const nextQueueStatus = mapUploadStatusToQueueStatus(status.status);
        const uploadJobId = typeof status.metadata?.uploadJobId === "string" ? status.metadata.uploadJobId : item.uploadJobId;
        const uploadJob = uploadJobId ? mediaUploadJobService.getUploadJob(uploadJobId) : null;
        const processingJobIds = uploadJob?.processingJobIds ?? [];
        updateQueueItem(queueItemId, {
          status: nextQueueStatus,
          progress: status.progress,
          uploadJobId,
          uploadJob: uploadJob ?? undefined,
          processingStatuses: processingJobIds.map((id) => mediaProcessingJobStatusService.getProcessingStatus(id)).filter(isProcessingStatus),
          errors: status.errors,
          warnings: status.warnings,
        });
        options.onStatusChange?.(status);
      },
    });
    clearProgressTimer(queueItemId);
    if (result.success) {
      const uploadJobId = typeof result.metadata?.uploadJobId === "string" ? result.metadata.uploadJobId : item.uploadJobId;
      const uploadJob = uploadJobId ? mediaUploadJobService.getUploadJob(uploadJobId) : null;
      const processingJobIds = uploadJob?.processingJobIds ?? [];
      const completed = {
        ...item,
        status: "completed" as const,
        progress: 100,
        uploadJobId,
        uploadJob: uploadJob ?? undefined,
        processingStatuses: processingJobIds.map((id) => mediaProcessingJobStatusService.getProcessingStatus(id)).filter(isProcessingStatus),
        uploadResult: result,
        warnings: result.warnings,
        updatedAt: nowIso(),
      };
      updateQueueItem(queueItemId, completed);
      onUploadSuccess?.(result, completed);
      return;
    }

    const uploadJobId = typeof result.metadata?.uploadJobId === "string" ? result.metadata.uploadJobId : item.uploadJobId;
    const failed = {
      ...item,
      status: "failed" as const,
      progress: 100,
      uploadJobId,
      uploadJob: uploadJobId ? mediaUploadJobService.getUploadJob(uploadJobId) ?? undefined : item.uploadJob,
      uploadResult: result,
      errors: result.errors ?? ["Upload failed."],
      updatedAt: nowIso(),
    };
    updateQueueItem(queueItemId, failed);
    onUploadError?.(failed.errors ?? [], failed);
  }, [clearProgressTimer, onUploadError, onUploadProgress, onUploadStart, onUploadSuccess, queue, updateQueueItem]);

  const startAllUploads = useCallback((options: MediaAssetUploadOptions = {}) => {
    queue.filter((item) => item.status === "ready" || item.status === "queued").forEach((item) => void startUpload(item.queueItemId, options));
  }, [queue, startUpload]);

  const retryUpload = useCallback((queueItemId: string) => {
    const item = queue.find((queueItem) => queueItem.queueItemId === queueItemId);
    if (!item) return;
    const uploadJob = item.uploadJobId ? mediaUploadJobService.retryUploadJob(item.uploadJobId) : item.uploadJob;
    const retryItem: AdminUploadQueueItem = { ...item, status: "ready", progress: 0, uploadJob: uploadJob ?? item.uploadJob, errors: undefined, updatedAt: nowIso() };
    updateQueueItem(queueItemId, retryItem);
    void startUpload(queueItemId, {}, retryItem);
  }, [queue, startUpload, updateQueueItem]);

  const cancelUpload = useCallback((queueItemId: string) => {
    clearProgressTimer(queueItemId);
    const item = queue.find((queueItem) => queueItem.queueItemId === queueItemId);
    const uploadJob = item?.uploadJobId ? mediaUploadJobService.markCanceled(item.uploadJobId) : item?.uploadJob;
    updateQueueItem(queueItemId, { status: "canceled", progress: 0, uploadJob: uploadJob ?? undefined });
  }, [clearProgressTimer, queue, updateQueueItem]);

  const removeQueueItem = useCallback((queueItemId: string) => {
    clearProgressTimer(queueItemId);
    setQueue((items) => items.filter((item) => item.queueItemId !== queueItemId));
  }, [clearProgressTimer]);

  const clearQueue = useCallback(() => {
    Object.keys(progressTimers.current).forEach(clearProgressTimer);
    setQueue([]);
  }, [clearProgressTimer]);

  const clearCompleted = useCallback(() => {
    setQueue((items) => items.filter((item) => item.status !== "completed"));
  }, []);

  return {
    queue,
    hasQueuedFiles: queue.length > 0,
    addFiles,
    startUpload,
    startAllUploads,
    retryUpload,
    cancelUpload,
    removeQueueItem,
    clearQueue,
    clearCompleted,
  };
};
