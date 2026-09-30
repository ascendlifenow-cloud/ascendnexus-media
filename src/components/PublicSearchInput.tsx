import { Search, X } from "lucide-react";

interface PublicSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  isLoading?: boolean;
}

export function PublicSearchInput({ value, onChange, onClear, isLoading = false }: PublicSearchInputProps) {
  return (
    <div className="rounded-anm-panel border border-white/10 bg-anm-surface-glass p-4 shadow-anm-card-glow backdrop-blur-xl">
      <label htmlFor="public-search" className="text-sm font-semibold text-white">
        Search catalog
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/46" aria-hidden="true" />
          <input
            id="public-search"
            type="search"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Search artists, songs, genres, or styles..."
            className="min-h-14 w-full rounded-md border border-white/12 bg-black/24 py-4 pl-12 pr-12 text-base text-white outline-none transition placeholder:text-white/38 focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20"
            aria-describedby="public-search-status"
          />
          {value ? (
            <button
              type="button"
              onClick={onClear}
              className="anm-focus absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {isLoading ? <p className="text-sm text-white/58">Searching...</p> : null}
      </div>
    </div>
  );
}
