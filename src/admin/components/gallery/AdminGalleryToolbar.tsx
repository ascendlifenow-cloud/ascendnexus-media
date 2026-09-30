import { Search, X } from "lucide-react";
import type { GalleryMediaType, GallerySourceType } from "../../../models/gallery";
import { Button } from "../../../components/ui/Button";
import {
  formatGalleryMediaType,
  formatGallerySourceType,
  type AdminGalleryMediaTypeFilter,
  type AdminGallerySortMode,
  type AdminGallerySourceTypeFilter,
  type AdminGalleryStatusFilter,
} from "../../utils/adminGalleryUtils";

interface AdminGalleryToolbarProps {
  searchQuery: string;
  mediaTypeFilter: AdminGalleryMediaTypeFilter;
  sourceTypeFilter: AdminGallerySourceTypeFilter;
  statusFilter: AdminGalleryStatusFilter;
  sortMode: AdminGallerySortMode;
  mediaTypes: readonly GalleryMediaType[];
  sourceTypes: readonly GallerySourceType[];
  resultCount: number;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onMediaTypeFilterChange: (value: AdminGalleryMediaTypeFilter) => void;
  onSourceTypeFilterChange: (value: AdminGallerySourceTypeFilter) => void;
  onStatusFilterChange: (value: AdminGalleryStatusFilter) => void;
  onSortModeChange: (value: AdminGallerySortMode) => void;
  onClearFilters: () => void;
}

export function AdminGalleryToolbar({
  searchQuery,
  mediaTypeFilter,
  sourceTypeFilter,
  statusFilter,
  sortMode,
  mediaTypes,
  sourceTypes,
  resultCount,
  totalCount,
  onSearchChange,
  onMediaTypeFilterChange,
  onSourceTypeFilterChange,
  onStatusFilterChange,
  onSortModeChange,
  onClearFilters,
}: AdminGalleryToolbarProps) {
  return (
    <section className="rounded-anm-panel border border-white/10 bg-anm-surface-glass p-4 shadow-anm-card-glow" aria-label="Gallery filters">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_13rem_12rem_11rem_13rem_auto] xl:items-end">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Search Gallery</span>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" aria-hidden />
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search title, slug, source, artist, release..."
              className="min-h-11 w-full rounded-md border border-white/12 bg-black/24 py-2 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Media Type</span>
          <select
            value={mediaTypeFilter}
            onChange={(event) => onMediaTypeFilterChange(event.target.value as AdminGalleryMediaTypeFilter)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="all">All Types</option>
            {mediaTypes.map((mediaType) => (
              <option key={mediaType} value={mediaType}>
                {formatGalleryMediaType(mediaType)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Source</span>
          <select
            value={sourceTypeFilter}
            onChange={(event) => onSourceTypeFilterChange(event.target.value as AdminGallerySourceTypeFilter)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="all">All Sources</option>
            {sourceTypes.map((sourceType) => (
              <option key={sourceType} value={sourceType}>
                {formatGallerySourceType(sourceType)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as AdminGalleryStatusFilter)}
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
            onChange={(event) => onSortModeChange(event.target.value as AdminGallerySortMode)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="sortOrder">Sort Order</option>
            <option value="createdNewest">Created Newest</option>
            <option value="createdOldest">Created Oldest</option>
            <option value="title">Title A-Z</option>
            <option value="mediaType">Media Type</option>
            <option value="sourceType">Source Type</option>
            <option value="status">Status</option>
          </select>
        </label>
        <Button type="button" variant="glass" onClick={onClearFilters}>
          <X className="h-4 w-4" aria-hidden />
          Clear
        </Button>
      </div>
      <p className="mt-3 text-sm text-white/52" aria-live="polite">
        Showing {resultCount} of {totalCount} gallery item records.
      </p>
    </section>
  );
}
