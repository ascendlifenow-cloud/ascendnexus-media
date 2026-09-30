import { useCallback, useMemo, useState } from "react";
import type {
  MediaAssetUploadOptions,
  MediaAssetUploadStatus,
  MediaUploadResult,
  MediaUploadTarget,
} from "../../models/media";
import { mediaAssetUploadService } from "../../services/media";

const terminalStatuses = new Set<MediaAssetUploadStatus["status"]>([
  "validation_failed",
  "completed",
  "failed",
  "canceled",
]);

export const useMediaAssetUpload = () => {
  const [activeUploads, setActiveUploads] = useState<MediaAssetUploadStatus[]>([]);
  const [results, setResults] = useState<MediaUploadResult[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const updateStatus = useCallback((status: MediaAssetUploadStatus) => {
    setActiveUploads((items) => {
      const existing = items.some((item) => item.uploadId === status.uploadId);
      const next = existing
        ? items.map((item) => (item.uploadId === status.uploadId ? status : item))
        : [...items, status];
      return next;
    });
  }, []);

  const uploadMediaAsset = useCallback(async (
    file: File,
    uploadTarget: MediaUploadTarget,
    options: MediaAssetUploadOptions = {},
  ) => {
    const result = await mediaAssetUploadService.uploadMediaAsset(file, uploadTarget, {
      ...options,
      onStatusChange: (status) => {
        updateStatus(status);
        options.onStatusChange?.(status);
      },
    });
    setResults((items) => [result, ...items]);
    if (!result.success) setErrors((items) => [...items, ...(result.errors ?? ["Upload failed."])]);
    return result;
  }, [updateStatus]);

  const uploadMultipleMediaAssets = useCallback(async (
    files: readonly File[],
    uploadTarget: MediaUploadTarget,
    options: MediaAssetUploadOptions = {},
  ) => {
    const uploadResults: MediaUploadResult[] = [];
    for (const file of files) {
      uploadResults.push(await uploadMediaAsset(file, uploadTarget, options));
    }
    return uploadResults;
  }, [uploadMediaAsset]);

  const clearUploadState = useCallback(() => {
    setActiveUploads([]);
    setResults([]);
    setErrors([]);
  }, []);

  const isUploading = useMemo(
    () => activeUploads.some((status) => !terminalStatuses.has(status.status)),
    [activeUploads],
  );

  return {
    activeUploads,
    results,
    errors,
    isUploading,
    uploadMediaAsset,
    uploadMultipleMediaAssets,
    clearUploadState,
  };
};
