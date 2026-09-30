import type { FilteredBrowseSong } from "../../utils/browseFilters";
import { SongGridCard } from "../songs";

interface FilteredSongResultsProps {
  songs: FilteredBrowseSong[];
}

export function FilteredSongResults({ songs }: FilteredSongResultsProps) {
  if (songs.length === 0) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {songs.map(({ release, artist }) => (
        <SongGridCard key={release.releaseId} release={release} artist={artist} />
      ))}
    </div>
  );
}
