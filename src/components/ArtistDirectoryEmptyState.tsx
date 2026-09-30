import { EmptyState } from "./EmptyState";

interface ArtistDirectoryEmptyStateProps {
  mode: "no-artists" | "no-results" | "error";
  onClearSearch?: () => void;
}

const copy = {
  "no-artists": {
    title: "No active artists",
    message: "Active Ascend Nexus Media persona profiles will appear here as the roster opens to the public.",
  },
  "no-results": {
    title: "No artists match your search",
    message: "Try a different artist name, sound, genre, or style term.",
  },
  error: {
    title: "Artist directory could not load",
    message: "Please refresh the page to try loading the public roster again.",
  },
};

export function ArtistDirectoryEmptyState({ mode, onClearSearch }: ArtistDirectoryEmptyStateProps) {
  return (
    <div>
      <EmptyState title={copy[mode].title} message={copy[mode].message} />
      {mode === "no-results" && onClearSearch ? (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={onClearSearch}
            className="min-h-11 rounded-md border border-white/14 px-5 text-sm font-bold text-white transition hover:bg-white hover:text-ink"
          >
            Clear Search
          </button>
        </div>
      ) : null}
    </div>
  );
}
