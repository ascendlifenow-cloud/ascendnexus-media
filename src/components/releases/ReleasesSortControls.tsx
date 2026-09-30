import type { ReleaseCatalogSortMode } from "../../services/ReleaseCatalogService";

interface ReleasesSortControlsProps {
  sortMode: ReleaseCatalogSortMode;
  resultCount: number;
  onSortChange: (sortMode: ReleaseCatalogSortMode) => void;
}

const sortOptions: Array<{ label: string; value: ReleaseCatalogSortMode }> = [
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
  { label: "Title A-Z", value: "title" },
  { label: "Artist A-Z", value: "artist" },
];

export function ReleasesSortControls({ sortMode, resultCount, onSortChange }: ReleasesSortControlsProps) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-white/10 bg-white/[0.055] p-4 sm:flex-row sm:items-center sm:justify-between">
      <p id="public-search-status" className="text-sm font-semibold text-white/68" aria-live="polite">
        {resultCount} matching release{resultCount === 1 ? "" : "s"}
      </p>
      <label className="flex flex-col gap-2 text-sm font-semibold text-white sm:min-w-56">
        Sort releases
        <select
          value={sortMode}
          onChange={(event) => onSortChange(event.target.value as ReleaseCatalogSortMode)}
          className="min-h-11 rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none transition focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
          aria-label="Sort releases"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
