import { Search, X } from "lucide-react";
import type { HomepageSectionType } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";
import {
  formatHomepageSectionType,
  type AdminHomepageEnabledFilter,
  type AdminHomepageSectionTypeFilter,
  type AdminHomepageSortMode,
} from "../../utils/adminHomepageUtils";

interface AdminHomepageToolbarProps {
  searchQuery: string;
  enabledFilter: AdminHomepageEnabledFilter;
  sectionTypeFilter: AdminHomepageSectionTypeFilter;
  sortMode: AdminHomepageSortMode;
  sectionTypes: readonly HomepageSectionType[];
  resultCount: number;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onEnabledFilterChange: (value: AdminHomepageEnabledFilter) => void;
  onSectionTypeFilterChange: (value: AdminHomepageSectionTypeFilter) => void;
  onSortModeChange: (value: AdminHomepageSortMode) => void;
  onClearFilters: () => void;
}

export function AdminHomepageToolbar({
  searchQuery,
  enabledFilter,
  sectionTypeFilter,
  sortMode,
  sectionTypes,
  resultCount,
  totalCount,
  onSearchChange,
  onEnabledFilterChange,
  onSectionTypeFilterChange,
  onSortModeChange,
  onClearFilters,
}: AdminHomepageToolbarProps) {
  return (
    <section className="rounded-anm-panel border border-white/10 bg-anm-surface-glass p-4 shadow-anm-card-glow" aria-label="Homepage section filters">
      <div className="grid gap-4 lg:grid-cols-[1fr_12rem_15rem_12rem_auto] lg:items-end">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Search Sections</span>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" aria-hidden />
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search section ID, type, title, or subtitle..."
              className="min-h-11 w-full rounded-md border border-white/12 bg-black/24 py-2 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Enabled</span>
          <select
            value={enabledFilter}
            onChange={(event) => onEnabledFilterChange(event.target.value as AdminHomepageEnabledFilter)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="all">All</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Section Type</span>
          <select
            value={sectionTypeFilter}
            onChange={(event) => onSectionTypeFilterChange(event.target.value as AdminHomepageSectionTypeFilter)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="all">All Types</option>
            {sectionTypes.map((sectionType) => (
              <option key={sectionType} value={sectionType}>
                {formatHomepageSectionType(sectionType)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Sort</span>
          <select
            value={sortMode}
            onChange={(event) => onSortModeChange(event.target.value as AdminHomepageSortMode)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="sortOrder">Sort Order</option>
            <option value="sectionType">Section Type</option>
            <option value="title">Title</option>
            <option value="enabled">Enabled State</option>
          </select>
        </label>
        <Button type="button" variant="glass" onClick={onClearFilters}>
          <X className="h-4 w-4" aria-hidden />
          Clear
        </Button>
      </div>
      <p className="mt-3 text-sm text-white/52" aria-live="polite">
        Showing {resultCount} of {totalCount} homepage sections.
      </p>
    </section>
  );
}
