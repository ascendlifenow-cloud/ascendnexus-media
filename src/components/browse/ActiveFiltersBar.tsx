import { X } from "lucide-react";
import { ClearFiltersButton } from "./ClearFiltersButton";

interface ActiveFiltersBarProps {
  selectedGenre: string;
  selectedTag: string;
  onRemoveGenre: () => void;
  onRemoveTag: () => void;
  onClear: () => void;
}

export function ActiveFiltersBar({ selectedGenre, selectedTag, onRemoveGenre, onRemoveTag, onClear }: ActiveFiltersBarProps) {
  const hasFilters = Boolean(selectedGenre || selectedTag);

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.055] p-4">
      {hasFilters ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {selectedGenre ? (
              <button type="button" onClick={onRemoveGenre} className="anm-focus inline-flex min-h-9 items-center gap-2 rounded-md border border-anm-gold/35 bg-anm-sunrise/18 px-3 text-sm font-semibold text-anm-gold">
                Genre: {selectedGenre}
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
            {selectedTag ? (
              <button type="button" onClick={onRemoveTag} className="anm-focus inline-flex min-h-9 items-center gap-2 rounded-md border border-anm-purple/35 bg-anm-purple/18 px-3 text-sm font-semibold text-anm-lavender">
                Style: {selectedTag}
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <ClearFiltersButton onClear={onClear} />
        </div>
      ) : (
        <p className="text-sm text-white/62">Choose a genre or style tag to begin browsing.</p>
      )}
    </div>
  );
}
