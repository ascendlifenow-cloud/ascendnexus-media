import type { MediaAccessLevel } from "../../../models/media";
import type { MediaLibraryAssetTypeSelection } from "../../utils/mediaLibraryUploadUtils";
import { AdminMediaUploadAssetTypeSelector } from "../../components/media/AdminMediaUploadAssetTypeSelector";

interface AdminBatchUploadOptionsProps {
  title: string;
  selectedAssetType: MediaLibraryAssetTypeSelection;
  accessLevel: MediaAccessLevel;
  allowMixedMedia: boolean;
  continueOnError: boolean;
  running?: boolean;
  onTitleChange: (value: string) => void;
  onAssetTypeChange: (value: MediaLibraryAssetTypeSelection) => void;
  onAccessLevelChange: (value: MediaAccessLevel) => void;
  onAllowMixedMediaChange: (value: boolean) => void;
  onContinueOnErrorChange: (value: boolean) => void;
}

export function AdminBatchUploadOptions({
  title,
  selectedAssetType,
  accessLevel,
  allowMixedMedia,
  continueOnError,
  running = false,
  onTitleChange,
  onAssetTypeChange,
  onAccessLevelChange,
  onAllowMixedMediaChange,
  onContinueOnErrorChange,
}: AdminBatchUploadOptionsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Batch Title</span>
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          disabled={running}
          placeholder="Media library batch"
          className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
        />
      </label>
      <AdminMediaUploadAssetTypeSelector value={selectedAssetType} onChange={onAssetTypeChange} />
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Access Level</span>
        <select
          value={accessLevel}
          onChange={(event) => onAccessLevelChange(event.target.value as MediaAccessLevel)}
          disabled={running}
          className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
        >
          <option value="admin_only">Admin Only</option>
          <option value="signed">Signed URL Ready</option>
          <option value="public">Public Asset Ready</option>
        </select>
      </label>
      <div className="grid gap-2 rounded-md border border-white/10 bg-black/18 p-3">
        <label className="flex items-center justify-between gap-3 text-sm font-semibold text-white">
          <span>Mixed media</span>
          <input type="checkbox" checked={allowMixedMedia} disabled={running} onChange={(event) => onAllowMixedMediaChange(event.target.checked)} />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm font-semibold text-white">
          <span>Continue on error</span>
          <input type="checkbox" checked={continueOnError} disabled={running} onChange={(event) => onContinueOnErrorChange(event.target.checked)} />
        </label>
      </div>
    </div>
  );
}
