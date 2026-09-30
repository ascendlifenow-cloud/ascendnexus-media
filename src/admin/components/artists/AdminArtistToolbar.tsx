import { Search, X } from "lucide-react";
import type { AdminArtistSortMode, AdminArtistStatusFilter } from "../../utils/adminArtistUtils";
import { Button } from "../../../components/ui/Button";

interface AdminArtistToolbarProps {
  searchQuery: string;
  statusFilter: AdminArtistStatusFilter;
  sortMode: AdminArtistSortMode;
  resultCount: number;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: AdminArtistStatusFilter) => void;
  onSortModeChange: (value: AdminArtistSortMode) => void;
  onClearFilters: () => void;
}

export function AdminArtistToolbar({
  searchQuery,
  statusFilter,
  sortMode,
  resultCount,
  totalCount,
  onSearchChange,
  onStatusFilterChange,
  onSortModeChange,
  onClearFilters,
}: AdminArtistToolbarProps) {
  return (
    <section className="rounded-anm-panel border border-white/10 bg-anm-surface-glass p-4 shadow-anm-card-glow" aria-label="Artist filters">
      <div className="grid gap-4 lg:grid-cols-[1fr_12rem_14rem_auto] lg:items-end">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Search Artists</span>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" aria-hidden />
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search name, slug, bio, genre, or style..."
              className="min-h-11 w-full rounded-md border border-white/12 bg-black/24 py-2 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as AdminArtistStatusFilter)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Sort</span>
          <select
            value={sortMode}
            onChange={(event) => onSortModeChange(event.target.value as AdminArtistSortMode)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="sortOrder">Sort Order</option>
            <option value="displayName">Display Name</option>
            <option value="createdAt">Created Date</option>
            <option value="updatedAt">Updated Date</option>
            <option value="status">Status</option>
          </select>
        </label>
        <Button type="button" variant="glass" onClick={onClearFilters}>
          <X className="h-4 w-4" aria-hidden />
          Clear
        </Button>
      </div>
      <p className="mt-3 text-sm text-white/52" aria-live="polite">
        Showing {resultCount} of {totalCount} artist records.
      </p>
    </section>
  );
}
