import { Search, X } from "lucide-react";
import type { ArtistAdminRecord } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";
import type {
  AdminReleaseFeaturedFilter,
  AdminReleaseSortMode,
  AdminReleaseStatusFilter,
} from "../../utils/adminReleaseUtils";

interface AdminReleaseToolbarProps {
  searchQuery: string;
  statusFilter: AdminReleaseStatusFilter;
  artistFilter: string;
  featuredFilter: AdminReleaseFeaturedFilter;
  genreFilter: string;
  sortMode: AdminReleaseSortMode;
  artists: readonly ArtistAdminRecord[];
  genres: readonly string[];
  resultCount: number;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: AdminReleaseStatusFilter) => void;
  onArtistFilterChange: (value: string) => void;
  onFeaturedFilterChange: (value: AdminReleaseFeaturedFilter) => void;
  onGenreFilterChange: (value: string) => void;
  onSortModeChange: (value: AdminReleaseSortMode) => void;
  onClearFilters: () => void;
}

export function AdminReleaseToolbar({
  searchQuery,
  statusFilter,
  artistFilter,
  featuredFilter,
  genreFilter,
  sortMode,
  artists,
  genres,
  resultCount,
  totalCount,
  onSearchChange,
  onStatusFilterChange,
  onArtistFilterChange,
  onFeaturedFilterChange,
  onGenreFilterChange,
  onSortModeChange,
  onClearFilters,
}: AdminReleaseToolbarProps) {
  return (
    <section className="rounded-anm-panel border border-white/10 bg-anm-surface-glass p-4 shadow-anm-card-glow" aria-label="Release filters">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_11rem_14rem_11rem_12rem_14rem_auto] xl:items-end">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Search Releases</span>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" aria-hidden />
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search title, slug, artist, genre, tags..."
              className="min-h-11 w-full rounded-md border border-white/12 bg-black/24 py-2 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as AdminReleaseStatusFilter)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Artist</span>
          <select
            value={artistFilter}
            onChange={(event) => onArtistFilterChange(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="all">All Artists</option>
            {artists.map((artist) => (
              <option key={artist.artistId} value={artist.artistId}>
                {artist.displayName} ({artist.status})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Featured</span>
          <select
            value={featuredFilter}
            onChange={(event) => onFeaturedFilterChange(event.target.value as AdminReleaseFeaturedFilter)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="all">All</option>
            <option value="featured">Featured</option>
            <option value="not_featured">Not Featured</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Genre</span>
          <select
            value={genreFilter}
            onChange={(event) => onGenreFilterChange(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="all">All Genres</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Sort</span>
          <select
            value={sortMode}
            onChange={(event) => onSortModeChange(event.target.value as AdminReleaseSortMode)}
            className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          >
            <option value="releaseDateNewest">Release Date Newest</option>
            <option value="releaseDateOldest">Release Date Oldest</option>
            <option value="title">Title A-Z</option>
            <option value="artist">Artist A-Z</option>
            <option value="updatedAt">Updated Date</option>
            <option value="status">Status</option>
            <option value="featuredSortOrder">Featured Sort Order</option>
          </select>
        </label>
        <Button type="button" variant="glass" onClick={onClearFilters}>
          <X className="h-4 w-4" aria-hidden />
          Clear
        </Button>
      </div>
      <p className="mt-3 text-sm text-white/52" aria-live="polite">
        Showing {resultCount} of {totalCount} release records.
      </p>
    </section>
  );
}
