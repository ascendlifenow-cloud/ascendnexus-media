import { Search, X } from "lucide-react";

interface ArtistSearchBarProps {
  value: string;
  resultCount: number;
  totalCount: number;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function ArtistSearchBar({ value, resultCount, totalCount, onChange, onClear }: ArtistSearchBarProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.055] p-4 shadow-xl shadow-black/20">
      <label htmlFor="artist-search" className="text-sm font-semibold text-white">
        Search artists
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/46" aria-hidden="true" />
          <input
            id="artist-search"
            type="search"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Search by name, bio, genre, or style"
            className="min-h-12 w-full rounded-md border border-white/12 bg-black/24 py-3 pl-11 pr-11 text-sm text-white outline-none transition placeholder:text-white/38 focus:border-cyanGlow focus:ring-2 focus:ring-cyanGlow/20"
          />
          {value ? (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Clear artist search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <p className="text-sm text-white/58" aria-live="polite">
          {resultCount} of {totalCount} artists
        </p>
      </div>
    </div>
  );
}
