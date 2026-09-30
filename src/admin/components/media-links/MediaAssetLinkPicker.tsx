import { useState } from "react";
import { FolderSearch, Link2 } from "lucide-react";
import type { MediaAssetRecord, MediaAssetType } from "../../../models/admin";
import type { MediaAssetLinkEntityType, MediaAssetLinkFieldKey, MediaAssetLinkIntendedUse } from "../../../models/media";
import { useMediaAssetLinkPicker } from "../../../hooks/media/useMediaAssetLinkPicker";
import { getMediaCategoryFromAssetType } from "../../../utils/media/mediaTypeUtils";
import { AdminRightShelf } from "../AdminRightShelf";
import { AdminMediaAssetThumbnail } from "../media/AdminMediaAssetThumbnail";
import { AdminMediaTypeBadge } from "../media/AdminMediaTypeBadge";
import { MediaAssetCompatibilityWarning } from "./MediaAssetCompatibilityWarning";
import { MediaAssetLinkButton } from "./MediaAssetLinkButton";

type AssetTypeFilter = MediaAssetType | MediaAssetType[];

export function MediaAssetLinkPicker({
  assets,
  entityType,
  fieldKey,
  intendedUse,
  assetTypeFilter,
  mediaCategoryFilter,
  onConfirm,
}: {
  assets: readonly MediaAssetRecord[];
  entityType: MediaAssetLinkEntityType;
  fieldKey: MediaAssetLinkFieldKey;
  intendedUse: MediaAssetLinkIntendedUse;
  assetTypeFilter?: AssetTypeFilter;
  mediaCategoryFilter?: ReturnType<typeof getMediaCategoryFromAssetType>;
  onConfirm: (asset: MediaAssetRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const picker = useMediaAssetLinkPicker(entityType, fieldKey, intendedUse);
  const query = picker.query.trim().toLowerCase();
  const allowedAssetTypes = Array.isArray(assetTypeFilter) ? assetTypeFilter : assetTypeFilter ? [assetTypeFilter] : [];
  const filteredAssets = assets
    .filter((asset) => allowedAssetTypes.length ? allowedAssetTypes.includes(asset.assetType) : true)
    .filter((asset) => mediaCategoryFilter ? getMediaCategoryFromAssetType(asset.assetType) === mediaCategoryFilter : true)
    .filter((asset) => query ? `${asset.title} ${asset.assetId}`.toLowerCase().includes(query) : true);

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Media Library Asset</p>
          <p className="mt-1 text-xs text-white/52">
            {picker.selectedAsset ? `Selected ${picker.selectedAsset.title}` : `${filteredAssets.length} compatible asset${filteredAssets.length === 1 ? "" : "s"} available.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/12 px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-anm-gold/45 hover:text-white focus:outline-none focus:ring-2 focus:ring-anm-electric/45"
        >
          <FolderSearch className="h-4 w-4" aria-hidden />
          Select from Library
        </button>
      </div>

      <AdminRightShelf
        open={open}
        title="Media Asset Picker"
        description="Choose a compatible asset for this field. The shelf closes after the asset is linked."
        onClose={() => setOpen(false)}
      >
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Available Assets</p>
              <p className="mt-1 text-xs text-white/52">{filteredAssets.length} matching asset{filteredAssets.length === 1 ? "" : "s"}</p>
            </div>
            <MediaAssetLinkButton
              label="Confirm Link"
              disabled={!picker.canConfirm || !picker.selectedAsset}
              onClick={() => {
                if (!picker.selectedAsset) return;
                onConfirm(picker.selectedAsset);
                setOpen(false);
              }}
            />
          </div>
          <input
            value={picker.query}
            onChange={(event) => picker.setQuery(event.target.value)}
            placeholder="Search media assets"
            className="anm-focus min-h-11 rounded-md border border-white/12 bg-white/[0.055] px-3 text-sm text-white placeholder:text-white/36"
          />
          <div className="grid gap-2">
            {filteredAssets.map((asset) => {
              const selected = picker.selectedAsset?.assetId === asset.assetId;
              return (
                <button
                  key={asset.assetId}
                  type="button"
                  onClick={() => picker.setSelectedAsset(asset)}
                  className={`rounded-md border p-3 text-left transition ${selected ? "border-anm-gold/55 bg-anm-gold/10" : "border-white/10 bg-white/[0.04] hover:border-anm-purple/40"}`}
                >
                  <div className="grid grid-cols-[4.5rem_1fr] gap-3">
                    <AdminMediaAssetThumbnail asset={asset} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <AdminMediaTypeBadge assetType={asset.assetType} />
                        <span className="text-xs text-white/44">{asset.status}</span>
                        {selected ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-anm-gold/35 bg-anm-gold/10 px-2 py-1 text-xs font-semibold text-anm-gold">
                            <Link2 className="h-3 w-3" aria-hidden />
                            Selected
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-white">{asset.title}</p>
                      <p className="mt-1 break-all text-xs text-white/46">{asset.url}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            {!filteredAssets.length ? (
              <p className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-4 text-sm text-white/56">
                No compatible media assets found.
              </p>
            ) : null}
          </div>
          <MediaAssetCompatibilityWarning compatibility={picker.compatibility} />
        </div>
      </AdminRightShelf>
    </div>
  );
}
