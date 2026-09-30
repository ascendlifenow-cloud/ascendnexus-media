import type { ArtistPublicProfile } from "../../models/artist";
import { PublicSearchInput } from "../PublicSearchInput";

interface ReleasesCatalogFiltersProps {
  query: string;
  artists: ArtistPublicProfile[];
  genres: string[];
  styleTags: string[];
  artistCounts: Record<string, number>;
  genreCounts: Record<string, number>;
  styleTagCounts: Record<string, number>;
  selectedArtist: string;
  selectedGenre: string;
  selectedTag: string;
  isLoading?: boolean;
  onQueryChange: (value: string) => void;
  onClearQuery: () => void;
  onArtistChange: (value: string) => void;
  onGenreChange: (value: string) => void;
  onTagChange: (value: string) => void;
}

const selectClassName =
  "min-h-12 w-full rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none transition focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20";

export function ReleasesCatalogFilters({
  query,
  artists,
  genres,
  styleTags,
  artistCounts,
  genreCounts,
  styleTagCounts,
  selectedArtist,
  selectedGenre,
  selectedTag,
  isLoading,
  onQueryChange,
  onClearQuery,
  onArtistChange,
  onGenreChange,
  onTagChange,
}: ReleasesCatalogFiltersProps) {
  return (
    <div className="grid gap-4 rounded-anm-panel border border-white/10 bg-anm-surface-glass p-5 shadow-anm-card-glow backdrop-blur-xl">
      <PublicSearchInput value={query} onChange={onQueryChange} onClear={onClearQuery} isLoading={isLoading} />
      <div className="grid gap-4 lg:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold text-white">
          Artist
          <select
            value={selectedArtist}
            onChange={(event) => onArtistChange(event.target.value)}
            className={selectClassName}
            aria-label="Filter releases by artist"
          >
            <option value="">All artists</option>
            {artists.map((artist) => (
              <option key={artist.artistId} value={artist.slug}>
                {artist.displayName} ({artistCounts[artist.slug] ?? 0})
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white">
          Genre
          <select
            value={selectedGenre}
            onChange={(event) => onGenreChange(event.target.value)}
            className={selectClassName}
            aria-label="Filter releases by genre"
          >
            <option value="">All genres</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre} ({genreCounts[genre] ?? 0})
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white">
          Style
          <select
            value={selectedTag}
            onChange={(event) => onTagChange(event.target.value)}
            className={selectClassName}
            aria-label="Filter releases by style tag"
          >
            <option value="">All styles</option>
            {styleTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag} ({styleTagCounts[tag] ?? 0})
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
