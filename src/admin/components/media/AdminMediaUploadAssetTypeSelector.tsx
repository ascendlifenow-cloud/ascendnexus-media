import type { MediaAssetType } from "../../../models/admin";
import {
  mediaLibraryUploadAssetTypes,
  type MediaLibraryAssetTypeSelection,
} from "../../utils/mediaLibraryUploadUtils";
import { formatMediaAssetType } from "../../utils/adminMediaUtils";

interface AdminMediaUploadAssetTypeSelectorProps {
  value: MediaLibraryAssetTypeSelection;
  onChange: (value: MediaLibraryAssetTypeSelection) => void;
}

export function AdminMediaUploadAssetTypeSelector({ value, onChange }: AdminMediaUploadAssetTypeSelectorProps) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Upload Asset Type</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as MediaLibraryAssetTypeSelection)}
        className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
      >
        <option value="auto">Auto infer from file</option>
        {mediaLibraryUploadAssetTypes.map((assetType: MediaAssetType) => (
          <option key={assetType} value={assetType}>
            {formatMediaAssetType(assetType)}
          </option>
        ))}
      </select>
    </label>
  );
}
