import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { MediaAssetRecord, MediaAssetType } from "../../models/admin";
import type { MediaAccessLevel, MediaUploadResult } from "../../models/media";
import { adminMediaKeys } from "../../utils/admin";
import {
  buildMediaLibraryUploadTarget,
  getUploadBatchSummary,
  mapUploadResultToMediaLibraryAsset,
  type MediaLibraryAssetTypeSelection,
} from "../utils/mediaLibraryUploadUtils";

interface UseAdminMediaLibraryUploadOptions {
  onAssetUploaded?: (asset: MediaAssetRecord) => void;
}

export function useAdminMediaLibraryUpload({ onAssetUploaded }: UseAdminMediaLibraryUploadOptions = {}) {
  const queryClient = useQueryClient();
  const [selectedAssetType, setSelectedAssetType] = useState<MediaLibraryAssetTypeSelection>("custom_image");
  const [accessLevel, setAccessLevel] = useState<MediaAccessLevel>("admin_only");
  const [completedAssets, setCompletedAssets] = useState<MediaAssetRecord[]>([]);
  const [uploadStatuses, setUploadStatuses] = useState<string[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const uploadTarget = useMemo(
    () => buildMediaLibraryUploadTarget(null, { selectedAssetType, accessLevel }),
    [accessLevel, selectedAssetType],
  );

  const uploadOptions = useMemo(() => ({
    status: "draft" as const,
    accessLevel,
    generateAssetRecord: true,
    description: "Uploaded through Admin Media Library",
    metadata: {
      uploadedFrom: "admin_media_library",
      selectedAssetType: selectedAssetType === "auto" ? "auto" : selectedAssetType,
      assignmentStatus: "unassigned",
    },
    onStatusChange: (status: { status: string }) => {
      setUploadStatuses((statuses) => [...statuses, status.status]);
    },
  }), [accessLevel, selectedAssetType]);

  const handleFilesSelected = useCallback((files: File[]) => {
    setLastError(null);
    setUploadStatuses((statuses) => [...statuses, ...files.map(() => "queued")]);
  }, []);

  const handleUploadSuccess = useCallback((result: MediaUploadResult) => {
    const asset = mapUploadResultToMediaLibraryAsset(result);
    if (!asset) return;
    setCompletedAssets((assets) => [asset, ...assets]);
    void queryClient.invalidateQueries({ queryKey: adminMediaKeys.all });
    onAssetUploaded?.(asset);
  }, [onAssetUploaded, queryClient]);

  const handleUploadError = useCallback((errors: string[]) => {
    setLastError(errors[0] ?? "Media upload failed.");
  }, []);

  const batchSummary = useMemo(() => getUploadBatchSummary(uploadStatuses), [uploadStatuses]);

  return {
    selectedAssetType,
    accessLevel,
    uploadTarget,
    uploadOptions,
    completedAssets,
    batchSummary,
    lastError,
    setSelectedAssetType: (value: MediaLibraryAssetTypeSelection) => setSelectedAssetType(value),
    setAccessLevel,
    handleFilesSelected,
    handleUploadSuccess,
    handleUploadError,
  };
}
