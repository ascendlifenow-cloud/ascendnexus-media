import { useState } from "react";
import { ChevronDown, Clock3, Library, Trash2 } from "lucide-react";
import type { MediaAssetRecord } from "../../../models/admin";
import type { MediaAssetAssignmentState } from "../../../models/media";
import { isMediaAssetSoftDeleted } from "../../../utils/media/mediaLifecycleUtils";
import { AdminMediaAssetCard } from "./AdminMediaAssetCard";

interface AdminMediaGridProps {
  assets: readonly MediaAssetRecord[];
  assignmentStates?: ReadonlyMap<string, MediaAssetAssignmentState>;
  selectedAssetId?: string;
  onSelectAsset: (asset: MediaAssetRecord) => void;
  onOpenAssetDetails: (asset: MediaAssetRecord) => void;
}

interface AdminMediaAssetSectionProps {
  sectionId: string;
  title: string;
  description: string;
  assets: readonly MediaAssetRecord[];
  assignmentStates?: ReadonlyMap<string, MediaAssetAssignmentState>;
  selectedAssetId?: string;
  defaultOpen?: boolean;
  icon: typeof Clock3;
  emptyText: string;
  onSelectAsset: (asset: MediaAssetRecord) => void;
  onOpenAssetDetails: (asset: MediaAssetRecord) => void;
}

const getDateValue = (value?: string): number => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

const getDeletedDateValue = (asset: MediaAssetRecord): number => {
  const metadata = asset.metadata ?? {};
  const deletedAt = typeof metadata.deletedAt === "string" ? metadata.deletedAt : undefined;
  return getDateValue(deletedAt ?? asset.updatedAt ?? asset.createdAt);
};

const isRecentlyDeletedAsset = (asset: MediaAssetRecord): boolean =>
  isMediaAssetSoftDeleted(asset) || String(asset.status) === "deleted";

const getRecentlyAddedAssets = (assets: readonly MediaAssetRecord[]): MediaAssetRecord[] =>
  [...assets]
    .filter((asset) => !isRecentlyDeletedAsset(asset))
    .sort((a, b) => getDateValue(b.createdAt) - getDateValue(a.createdAt))
    .slice(0, 12);

const getRecentlyDeletedAssets = (assets: readonly MediaAssetRecord[]): MediaAssetRecord[] =>
  [...assets]
    .filter(isRecentlyDeletedAsset)
    .sort((a, b) => getDeletedDateValue(b) - getDeletedDateValue(a));

function AdminMediaAssetSection({
  sectionId,
  title,
  description,
  assets,
  assignmentStates,
  selectedAssetId,
  defaultOpen = true,
  icon: Icon,
  emptyText,
  onSelectAsset,
  onOpenAssetDetails,
}: AdminMediaAssetSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-md border border-white/[0.07] bg-white/[0.025] shadow-[0_12px_32px_rgba(0,0,0,0.14)]" aria-labelledby={sectionId}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] bg-white/[0.04] px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-anm-electric/45"
          aria-expanded={open}
          aria-controls={`${sectionId}-content`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-anm-gold/25 bg-anm-gold/10">
            <Icon className="h-4 w-4 text-anm-gold" aria-hidden />
          </span>
          <span className="min-w-0">
            <span id={sectionId} className="block text-base font-semibold text-white">{title}</span>
            <span className="mt-1 block text-sm text-white/52">{description}</span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-white/52 transition ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-black/18 px-2.5 py-1 text-xs font-semibold text-white/62">
            {assets.length} row{assets.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {open ? (
        <div id={`${sectionId}-content`} className="max-h-[34rem] overflow-y-auto overscroll-contain p-3" aria-labelledby={sectionId}>
          {assets.length ? (
            <div className="grid gap-3 pr-1">
              {assets.map((asset) => (
                <AdminMediaAssetCard
                  key={`${sectionId}-${asset.assetId}`}
                  asset={asset}
                  assignmentState={assignmentStates?.get(asset.assetId)}
                  selected={asset.assetId === selectedAssetId}
                  onSelect={onSelectAsset}
                  onOpenDetails={onOpenAssetDetails}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-white/10 bg-black/16 p-4 text-sm text-white/54">{emptyText}</div>
          )}
        </div>
      ) : null}
    </section>
  );
}

export function AdminMediaGrid({ assets, assignmentStates, selectedAssetId, onSelectAsset, onOpenAssetDetails }: AdminMediaGridProps) {
  const recentlyAddedAssets = getRecentlyAddedAssets(assets);
  const recentlyDeletedAssets = getRecentlyDeletedAssets(assets);

  return (
    <section aria-labelledby="admin-media-grid-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 id="admin-media-grid-heading" className="text-xl font-semibold text-white">
          Media Assets
        </h2>
        <p className="text-sm text-white/52">{assets.length} filtered row{assets.length === 1 ? "" : "s"}</p>
      </div>
      <div className="grid gap-3">
        <AdminMediaAssetSection
          sectionId="admin-media-recently-added"
          title="Recently Added"
          description="Newest matching assets by created date."
          assets={recentlyAddedAssets}
          assignmentStates={assignmentStates}
          selectedAssetId={selectedAssetId}
          icon={Clock3}
          emptyText="No recently added assets match the current filters."
          onSelectAsset={onSelectAsset}
          onOpenAssetDetails={onOpenAssetDetails}
        />
        <AdminMediaAssetSection
          sectionId="admin-media-all-assets"
          title="All Media Assets"
          description="Every matching media asset row."
          assets={assets}
          assignmentStates={assignmentStates}
          selectedAssetId={selectedAssetId}
          icon={Library}
          emptyText="No assets match the current filters."
          onSelectAsset={onSelectAsset}
          onOpenAssetDetails={onOpenAssetDetails}
        />
        <AdminMediaAssetSection
          sectionId="admin-media-recently-deleted"
          title="Recently Deleted"
          description="Soft-deleted or deleted assets matching the current filters."
          assets={recentlyDeletedAssets}
          assignmentStates={assignmentStates}
          selectedAssetId={selectedAssetId}
          defaultOpen={recentlyDeletedAssets.length > 0}
          icon={Trash2}
          emptyText="No deleted assets match the current filters."
          onSelectAsset={onSelectAsset}
          onOpenAssetDetails={onOpenAssetDetails}
        />
      </div>
    </section>
  );
}
