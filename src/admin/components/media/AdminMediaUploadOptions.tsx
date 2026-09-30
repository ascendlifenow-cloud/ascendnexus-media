import type { MediaAccessLevel } from "../../../models/media";
import type { MediaLibraryAssetTypeSelection } from "../../utils/mediaLibraryUploadUtils";
import { AdminMediaUploadAssetTypeSelector } from "./AdminMediaUploadAssetTypeSelector";

interface AdminMediaUploadOptionsProps {
  selectedAssetType: MediaLibraryAssetTypeSelection;
  accessLevel: MediaAccessLevel;
  onAssetTypeChange: (value: MediaLibraryAssetTypeSelection) => void;
  onAccessLevelChange: (value: MediaAccessLevel) => void;
}

export function AdminMediaUploadOptions({
  selectedAssetType,
  accessLevel,
  onAssetTypeChange,
  onAccessLevelChange,
}: AdminMediaUploadOptionsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <AdminMediaUploadAssetTypeSelector value={selectedAssetType} onChange={onAssetTypeChange} />
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Access Level</span>
        <select
          value={accessLevel}
          onChange={(event) => onAccessLevelChange(event.target.value as MediaAccessLevel)}
          className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
        >
          <option value="admin_only">Admin Only</option>
          <option value="signed">Signed URL Ready</option>
          <option value="public">Public Asset Ready</option>
        </select>
      </label>
      <div className="rounded-md border border-white/10 bg-black/18 p-3 text-sm text-white/58">
        <p className="font-semibold text-white">Owner Assignment</p>
        <p className="mt-1">Uploads default to Media Library / Unassigned and can be linked later.</p>
      </div>
    </div>
  );
}
