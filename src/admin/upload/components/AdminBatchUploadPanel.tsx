import { useCallback, useState } from "react";
import type { MediaAssetRecord, MediaAssetType } from "../../../models/admin";
import type { MediaAccessLevel, MediaBatchUploadOptions } from "../../../models/media";
import { useMediaBatchUpload } from "../../../hooks/media/useMediaBatchUpload";
import type { MediaLibraryAssetTypeSelection } from "../../utils/mediaLibraryUploadUtils";
import { AdminMediaUploadedAssetCard } from "../../components/media/AdminMediaUploadedAssetCard";
import { AdminBatchUploadActions } from "./AdminBatchUploadActions";
import { AdminBatchUploadDropzone } from "./AdminBatchUploadDropzone";
import { AdminBatchUploadOptions } from "./AdminBatchUploadOptions";
import { AdminBatchUploadQueue } from "./AdminBatchUploadQueue";
import { AdminBatchUploadResultReport } from "./AdminBatchUploadResultReport";
import { AdminBatchUploadSummary } from "./AdminBatchUploadSummary";
import { AdminBatchUploadValidationSummary } from "./AdminBatchUploadValidationSummary";

interface AdminBatchUploadPanelProps {
  onAssetUploaded?: (asset: MediaAssetRecord) => void;
  onAssetView?: (asset: MediaAssetRecord) => void;
}

const toBatchOptions = (
  title: string,
  selectedAssetType: MediaLibraryAssetTypeSelection,
  accessLevel: MediaAccessLevel,
  allowMixedMedia: boolean,
  continueOnError: boolean,
): Partial<MediaBatchUploadOptions> => ({
  title: title.trim() || "Media library batch",
  defaultAssetType: selectedAssetType === "auto" ? undefined : selectedAssetType as MediaAssetType,
  allowMixedMedia,
  autoInferAssetType: selectedAssetType === "auto",
  continueOnError,
  maxFiles: 24,
  accessLevel,
  targetType: "media_library",
  ownerType: "media_library",
  intendedUse: "batch_upload",
  metadata: {
    uploadedFrom: "admin_media_library_batch",
    selectedAssetType,
    assignmentStatus: "unassigned",
  },
});

export function AdminBatchUploadPanel({ onAssetUploaded, onAssetView }: AdminBatchUploadPanelProps) {
  const [title, setTitle] = useState("Media library batch");
  const [selectedAssetType, setSelectedAssetType] = useState<MediaLibraryAssetTypeSelection>("auto");
  const [accessLevel, setAccessLevel] = useState<MediaAccessLevel>("public");
  const [allowMixedMedia, setAllowMixedMedia] = useState(true);
  const [continueOnError, setContinueOnError] = useState(true);
  const batch = useMediaBatchUpload({ onAssetUploaded });

  const buildOptions = useCallback(() => (
    toBatchOptions(title, selectedAssetType, accessLevel, allowMixedMedia, continueOnError)
  ), [accessLevel, allowMixedMedia, continueOnError, selectedAssetType, title]);

  const handleFilesSelected = useCallback((files: File[]) => {
    batch.createSession(files, buildOptions());
  }, [batch, buildOptions]);

  return (
    <section className="grid gap-5" aria-label="Batch media upload">
      <AdminBatchUploadOptions
        title={title}
        selectedAssetType={selectedAssetType}
        accessLevel={accessLevel}
        allowMixedMedia={allowMixedMedia}
        continueOnError={continueOnError}
        running={batch.running}
        onTitleChange={setTitle}
        onAssetTypeChange={setSelectedAssetType}
        onAccessLevelChange={setAccessLevel}
        onAllowMixedMediaChange={setAllowMixedMedia}
        onContinueOnErrorChange={setContinueOnError}
      />
      <AdminBatchUploadDropzone disabled={batch.running} onFilesSelected={handleFilesSelected} />
      <AdminBatchUploadValidationSummary session={batch.session} lastError={batch.lastError} />
      <AdminBatchUploadSummary summary={batch.summary} />
      <AdminBatchUploadActions
        session={batch.session}
        running={batch.running}
        onValidate={() => void batch.validateSession()}
        onStart={() => void batch.startUpload()}
        onRetryFailed={() => void batch.retryFailed()}
        onCancel={() => void batch.cancelBatch()}
        onClearCompleted={() => void batch.clearCompleted()}
      />
      <AdminBatchUploadQueue
        session={batch.session}
        running={batch.running}
        onRetryFile={(batchFileId) => void batch.retryFile(batchFileId)}
        onCancelFile={batch.cancelFile}
      />
      <AdminBatchUploadResultReport session={batch.session} />
      {batch.uploadedAssets.length ? (
        <div className="grid gap-3">
          <h3 className="text-base font-semibold text-white">Uploaded This Batch</h3>
          <div className="grid gap-3">
            {batch.uploadedAssets.map((asset) => (
              <AdminMediaUploadedAssetCard key={asset.assetId} asset={asset} onView={onAssetView ?? onAssetUploaded ?? (() => undefined)} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
