import { Search, X } from "lucide-react";
import type { MediaAssetOwnerType, MediaAssetType } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";
import {
  formatMediaAssetType,
  formatMediaOwnerType,
  type AdminMediaAssetTypeFilter,
  type AdminMediaOwnerTypeFilter,
  type AdminMediaSortMode,
  type AdminMediaStatusFilter,
} from "../../utils/adminMediaUtils";

interface AdminMediaToolbarProps {
  searchQuery: string;
  assetTypeFilter: AdminMediaAssetTypeFilter;
  ownerTypeFilter: AdminMediaOwnerTypeFilter;
  statusFilter: AdminMediaStatusFilter;
  sortMode: AdminMediaSortMode;
  assetTypes: readonly MediaAssetType[];
  ownerTypes: readonly MediaAssetOwnerType[];
  resultCount: number;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onAssetTypeFilterChange: (value: AdminMediaAssetTypeFilter) => void;
  onOwnerTypeFilterChange: (value: AdminMediaOwnerTypeFilter) => void;
  onStatusFilterChange: (value: AdminMediaStatusFilter) => void;
  onSortModeChange: (value: AdminMediaSortMode) => void;
  onClearFilters: () => void;
}

export function AdminMediaToolbar({
  searchQuery,
  assetTypeFilter,
  ownerTypeFilter,
  statusFilter,
  sortMode,
  assetTypes,
  ownerTypes,
  resultCount,
  totalCount,
  onSearchChange,
  onAssetTypeFilterChange,
  onOwnerTypeFilterChange,
  onStatusFilterChange,
  onSortModeChange,
  onClearFilters,
}: AdminMediaToolbarProps) {
  return (
    <section className="rounded-anm-panel border border-white/10 bg-anm-surface-glass p-4 shadow-anm-card-glow" aria-label="Media filters">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_13rem_12rem_11rem_13rem_auto] xl:items-end">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Search Media</span>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" aria-hidden />
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search title, asset ID, owner, alt text..."
              className="min-h-11 w-full rounded-md border border-white/12 bg-black/24 py-2 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Asset Type</span>
          <select
            value={assetTypeFilter}
            onChange={(event) => onAssetTypeFilterChange(event.target.value as AdminMediaAssetTypeFilter)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="all">All Types</option>
            {assetTypes.map((assetType) => (
              <option key={assetType} value={assetType}>
                {formatMediaAssetType(assetType)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Owner</span>
          <select
            value={ownerTypeFilter}
            onChange={(event) => onOwnerTypeFilterChange(event.target.value as AdminMediaOwnerTypeFilter)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="all">All Owners</option>
            {ownerTypes.map((ownerType) => (
              <option key={ownerType} value={ownerType}>
                {formatMediaOwnerType(ownerType)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as AdminMediaStatusFilter)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Sort</span>
          <select
            value={sortMode}
            onChange={(event) => onSortModeChange(event.target.value as AdminMediaSortMode)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="createdNewest">Created Newest</option>
            <option value="createdOldest">Created Oldest</option>
            <option value="updatedNewest">Updated Newest</option>
            <option value="title">Title A-Z</option>
            <option value="assetType">Asset Type</option>
            <option value="ownerType">Owner Type</option>
            <option value="sortOrder">Sort Order</option>
          </select>
        </label>
        <Button type="button" variant="glass" onClick={onClearFilters}>
          <X className="h-4 w-4" aria-hidden />
          Clear
        </Button>
      </div>
      <p className="mt-3 text-sm text-white/52" aria-live="polite">
        Showing {resultCount} of {totalCount} media asset records.
      </p>
    </section>
  );
}
