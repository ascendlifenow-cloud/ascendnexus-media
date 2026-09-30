import { Search, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import {
  formatMetadataEntityType,
  type AdminMetadataEntityTypeFilter,
  type AdminMetadataSortMode,
  type AdminMetadataStatusFilter,
} from "../../utils/adminMetadataUtils";
import type { AdminMetadataEntityType } from "../../../models/admin";

const entityTypeOptions: AdminMetadataEntityType[] = [
  "site_default",
  "page",
  "artist",
  "release",
  "song",
  "gallery",
  "search",
  "browse",
  "custom",
];

interface AdminSeoToolbarProps {
  searchQuery: string;
  entityTypeFilter: AdminMetadataEntityTypeFilter;
  statusFilter: AdminMetadataStatusFilter;
  sortMode: AdminMetadataSortMode;
  resultCount: number;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onEntityTypeFilterChange: (value: AdminMetadataEntityTypeFilter) => void;
  onStatusFilterChange: (value: AdminMetadataStatusFilter) => void;
  onSortModeChange: (value: AdminMetadataSortMode) => void;
  onClearFilters: () => void;
}

export function AdminSeoToolbar({
  searchQuery,
  entityTypeFilter,
  statusFilter,
  sortMode,
  resultCount,
  totalCount,
  onSearchChange,
  onEntityTypeFilterChange,
  onStatusFilterChange,
  onSortModeChange,
  onClearFilters,
}: AdminSeoToolbarProps) {
  return (
    <section className="rounded-anm-panel border border-white/10 bg-anm-surface-glass p-4 shadow-anm-card-glow" aria-label="Metadata filters">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_13rem_13rem_13rem_auto] xl:items-end">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Search Metadata</span>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" aria-hidden />
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search title, description, slug, path, image alt..."
              className="min-h-11 w-full rounded-md border border-white/12 bg-black/24 py-2 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Entity Type</span>
          <select
            value={entityTypeFilter}
            onChange={(event) => onEntityTypeFilterChange(event.target.value as AdminMetadataEntityTypeFilter)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="all">All</option>
            {entityTypeOptions.map((entityType) => (
              <option key={entityType} value={entityType}>
                {formatMetadataEntityType(entityType)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as AdminMetadataStatusFilter)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="all">All</option>
            <option value="complete">Complete</option>
            <option value="missing_title">Missing Title</option>
            <option value="missing_description">Missing Description</option>
            <option value="missing_image">Missing Image</option>
            <option value="no_index">No-Index</option>
            <option value="needs_review">Needs Review</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Sort</span>
          <select
            value={sortMode}
            onChange={(event) => onSortModeChange(event.target.value as AdminMetadataSortMode)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="needsReview">Needs Review First</option>
            <option value="entityType">Entity Type</option>
            <option value="title">Title A-Z</option>
            <option value="missingFields">Missing Fields</option>
            <option value="updatedAt">Updated Date</option>
            <option value="noIndex">No-Index First</option>
          </select>
        </label>
        <Button type="button" variant="glass" onClick={onClearFilters}>
          <X className="h-4 w-4" aria-hidden />
          Clear
        </Button>
      </div>
      <p className="mt-3 text-sm text-white/52" aria-live="polite">
        Showing {resultCount} of {totalCount} metadata records.
      </p>
    </section>
  );
}
